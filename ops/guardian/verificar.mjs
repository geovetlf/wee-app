#!/usr/bin/env node
/*
 * LA VERIFICACIÓN POR DOMINIOS DEL GUARDIAN — `ops/guardian/verificar.mjs`.
 *
 *   node ops/guardian/verificar.mjs [--modo estatico|ejecutar] [--dominios a,b | --criticos] [--paralelo N]
 *        [--limite-s S] [--estabilidad N] [--json ruta] [--md ruta] [--raiz dir]
 *
 * No es otra batería de pruebas: ejecuta, agrupadas por DOMINIO (ops/guardian/dominios.json), las suites que la cadena de
 * `npm test` ya tiene, y comprueba lo que nadie comprobaba: que el mapa de dominios es coherente con la cadena (ninguna suite
 * sin dominio, ninguna citada que no exista), que ningún dominio crítico queda sin verificar, y que ninguna comprobación de
 * las suites de invariantes ha desaparecido (ops/guardian/huellas.mjs).
 *
 * Dos modos:
 *   estatico (por defecto)  mapa + invariantes + huellas. Segundos, sin compilar ni ejecutar suites: lo que corre el job
 *                           «Guardian · dominios» en cada PR. Lo dice en el informe (`ejecucion: "no-ejecutada"`): un verde
 *                           estático NO significa que las suites pasaran (eso lo hace el Nivel 2 de la CI).
 *   ejecutar                además ejecuta las suites de los dominios elegidos, con la clasificación de abajo.
 *
 * FALLA CERRADO: un mapa roto, una huella que cae, un dominio crítico sin suites, un entorno que no se puede verificar
 * (`functions/lib` desfasado, claves reales en el entorno) o un informe que no se puede escribir NUNCA son un verde.
 *
 * CLASIFICACIÓN (nunca se oculta nada): una suite que falla se vuelve a ejecutar UNA vez, sola, y SOLO para saber qué fue:
 *   · falla de nuevo con la misma firma  → FALLA (reproducible)        · falla con otra firma → FALLA (inestable)
 *   · pasa la segunda vez                → INTERMITENTE (NO es verde: queda registrada con las dos salidas)
 *   · el entorno no deja ejecutarla (módulo ausente, puerto ocupado, sin red de emulador…) → ENTORNO (NO es verde)
 * Ninguna repetición convierte un fallo en un pase. Con `--estabilidad N` cada suite se ejecuta N veces seguidas y se informa
 * la tasa de fallo: es la herramienta para CAZAR una intermitencia, no para taparla.
 *
 * Salidas: 0 PASA · 1 FALLA · 3 entrada o fallo interno · 4 INTERMITENTE · 5 ENTORNO. Sin push, sin despliegue, sin red, sin
 * secretos: solo lee el repositorio y lanza `node functions/test/<suite>.test.mjs`. Lo fija functions/test/guardian-dominios.test.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { suitesDeLaCadena, libDesfasado, avisoDeLib } from '../../functions/test/_cadena.mjs';
import { motivos as motivosDeEntorno } from '../../scripts/ci-sin-secretos.mjs';
import { leerMapa, validarDominios, seleccionar } from './dominios.mjs';
import { verificarHuellas } from './huellas.mjs';

export const CONTRATO = 'wee-guardian-verificacion@1';
export const SALIDA = Object.freeze({ PASA: 0, FALLA: 1, ENTRADA: 3, INTERMITENTE: 4, ENTORNO: 5 });
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const LIMITE_POR_DEFECTO_S = 600;
export const MAX_ESTABILIDAD = 50;
const MAX_SALIDA = 200;

/** Lo que el entorno dice cuando NO deja ejecutar (y no es un fallo del código): se mira en la salida de la suite. */
export const PATRONES_DE_ENTORNO = Object.freeze([
  /Cannot find (?:module|package) '(?!\.)/i,
  /ERR_MODULE_NOT_FOUND/,
  /functions\/lib no está al día/,
  /\bEADDRINUSE\b/,
  /\bEMFILE\b|\bENOSPC\b|\bENOMEM\b/,
  /spawn \S+ ENOENT/,
  /\bJava\b.*(?:not found|no está|no se encontr)|firebase.*(?:not found|command not found)/i,
]);

/* ── Secretos: lo que se guarda como evidencia nunca lleva una credencial ───────────────────────────────────────── */
const REDACCIONES = [
  [/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTADO:clave-google]'],
  [/ya29\.[0-9A-Za-z_-]{20,}/g, '[REDACTADO:token-google]'],
  [/\b(?:ghp|gho|ghs|ghu|github_pat)_[0-9A-Za-z_]{20,}/g, '[REDACTADO:token-github]'],
  [/\bsk-[0-9A-Za-z_-]{20,}/g, '[REDACTADO:clave]'],
  [/(Bearer\s+)[0-9A-Za-z._~+/=-]{16,}/gi, '$1[REDACTADO]'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTADO:clave-privada]'],
  [/("private_key"\s*:\s*")[^"]+/g, '$1[REDACTADO]'],
];
export const redactar = (texto) => REDACCIONES.reduce((t, [re, por]) => t.replace(re, por), String(texto ?? ''));

/** Pura: la cola de una salida, redactada y con tope (la evidencia que se conserva). */
export const colaDe = (salida, n = MAX_SALIDA) => redactar(String(salida || '').trimEnd().split('\n').slice(-n).join('\n'));

/** Pura: la FIRMA de un fallo = sus líneas `✘` sin tiempos ni números sueltos de medida; sirve para saber si dos fallos son el mismo. */
export const firmaDeFallo = (salida) => {
  const lineas = String(salida || '').split('\n').filter((l) => /^\s*✘/.test(l))
    .map((l) => l.replace(/\d+(?:[.,]\d+)?\s*(?:ms|s|segundos)\b/gi, '<t>').replace(/\s+/g, ' ').trim());
  return [...new Set(lineas)].sort().join('\n');
};

/** Pura: ¿la salida de esta suite dice que el ENTORNO no la dejó ejecutarse? */
export const esDeEntorno = (resultado) => Boolean(resultado?.errorDeSpawn)
  || PATRONES_DE_ENTORNO.some((re) => re.test(String(resultado?.salida || '')));

/**
 * Pura: de dos ejecuciones de la misma suite (la segunda SOLO para clasificar), qué fue. Nunca devuelve PASA si la primera falló.
 *   primera.ok → PASA (no hay segunda). Si no: ENTORNO | INTERMITENTE | FALLA(reproducible|inestable).
 */
export const clasificar = ({ primera, segunda = null }) => {
  if (primera.ok) return { estado: 'PASA', clase: 'pasa' };
  if (esDeEntorno(primera) && (!segunda || esDeEntorno(segunda))) return { estado: 'ENTORNO', clase: 'entorno', motivo: primera.errorDeSpawn || 'el entorno no deja ejecutar la suite' };
  if (!segunda) return { estado: 'FALLA', clase: 'sin-repeticion' };
  if (segunda.ok) return { estado: 'INTERMITENTE', clase: 'intermitente', motivo: 'falló y al repetirla sola pasó: NO es verde (causa sin resolver)' };
  const a = firmaDeFallo(primera.salida);
  const b = firmaDeFallo(segunda.salida);
  return a === b
    ? { estado: 'FALLA', clase: 'reproducible' }
    : { estado: 'FALLA', clase: 'inestable', motivo: 'falla las dos veces con firmas distintas' };
};

/** Ejecuta una suite (`node test/<suite>.test.mjs` desde functions/). Devuelve { ok, codigo, ms, salida, errorDeSpawn? }. */
export const ejecutarSuiteReal = (suite, { raiz = REPO, limiteMs = LIMITE_POR_DEFECTO_S * 1000, env = process.env } = {}) => new Promise((resolve) => {
  const inicio = Date.now();
  const cwd = path.join(raiz, 'functions');
  let salida = '';
  let terminado = false;
  const fin = (r) => { if (!terminado) { terminado = true; resolve({ ms: Date.now() - inicio, ...r }); } };
  let hijo;
  try { hijo = spawn(process.execPath, [`test/${suite}.test.mjs`], { cwd, env, windowsHide: true }); } catch (e) { fin({ ok: false, codigo: null, salida: '', errorDeSpawn: e.message }); return; }
  hijo.stdout.on('data', (d) => { salida += d; });
  hijo.stderr.on('data', (d) => { salida += d; });
  const reloj = setTimeout(() => { salida += `\n[guardian] más de ${limiteMs / 1000} s: se corta`; hijo.kill(); }, limiteMs);
  hijo.on('error', (e) => { clearTimeout(reloj); fin({ ok: false, codigo: null, salida, errorDeSpawn: e.message }); });
  hijo.on('close', (codigo) => { clearTimeout(reloj); fin({ ok: codigo === 0, codigo, salida }); });
});

const reparto = async (items, paralelo, f) => {
  const res = new Array(items.length);
  let siguiente = 0;
  const trabajador = async () => { while (siguiente < items.length) { const i = siguiente++; res[i] = await f(items[i], i); } };
  await Promise.all(Array.from({ length: Math.max(1, paralelo) }, trabajador));
  return res;
};

/** Una suite: ejecutarla, y si falla repetirla UNA vez sola para clasificarla. Nunca convierte un fallo en un pase. */
export const verificarSuite = async (suite, { ejecutarSuite, limiteMs, clasificarFallo = true }) => {
  const primera = await ejecutarSuite(suite, { limiteMs });
  const segunda = !primera.ok && clasificarFallo && !esDeEntorno(primera) ? await ejecutarSuite(suite, { limiteMs }) : null;
  const c = clasificar({ primera, segunda });
  const fila = { suite, estado: c.estado, clase: c.clase, ms: primera.ms };
  if (c.motivo) fila.motivo = c.motivo;
  if (c.estado !== 'PASA') {
    fila.evidencia = { primera: { codigo: primera.codigo, cola: colaDe(primera.salida), firma: firmaDeFallo(primera.salida) } };
    if (segunda) fila.evidencia.repeticion = { codigo: segunda.codigo, ok: segunda.ok, cola: colaDe(segunda.salida), firma: firmaDeFallo(segunda.salida) };
  }
  return fila;
};

/** Modo estabilidad: N ejecuciones seguidas de una suite (sin parar en el primer fallo) y la tasa. Es para cazar una intermitencia. */
export const medirEstabilidad = async (suite, { ejecutarSuite, limiteMs, veces }) => {
  const corridas = [];
  for (let i = 0; i < veces; i++) corridas.push(await ejecutarSuite(suite, { limiteMs }));
  const fallos = corridas.filter((c) => !c.ok);
  const entorno = fallos.some((c) => esDeEntorno(c));
  const firmas = [...new Set(fallos.map((c) => firmaDeFallo(c.salida)))];
  const estado = !fallos.length ? 'PASA' : entorno ? 'ENTORNO' : fallos.length === veces ? 'FALLA' : 'INTERMITENTE';
  const fila = { suite, estado, clase: 'estabilidad', ms: corridas.reduce((n, c) => n + c.ms, 0), estabilidad: { veces, fallos: fallos.length, firmas } };
  if (fallos.length) fila.evidencia = { primera: { codigo: fallos[0].codigo, cola: colaDe(fallos[0].salida), firma: firmaDeFallo(fallos[0].salida) } };
  return fila;
};

const PESO = { PASA: 0, ENTORNO: 1, INTERMITENTE: 2, FALLA: 3 };
const peor = (estados) => estados.reduce((m, e) => (PESO[e] > PESO[m] ? e : m), 'PASA');
export const salidaDe = (estado) => ({ PASA: SALIDA.PASA, FALLA: SALIDA.FALLA, INTERMITENTE: SALIDA.INTERMITENTE, ENTORNO: SALIDA.ENTORNO }[estado] ?? SALIDA.ENTRADA);

/**
 * Pura + inyectable: el informe entero. `ejecutarSuite` se inyecta (las pruebas no lanzan procesos). Nunca lanza por un fallo de
 * suite: lanza solo por entrada inválida; un problema del mapa o de las huellas entra en el informe como FALLA.
 */
export const verificar = async ({
  raiz = REPO, modo = 'estatico', dominios = null, criticos = false, paralelo = 4, limiteMs = LIMITE_POR_DEFECTO_S * 1000,
  estabilidad = 0, ejecutarSuite = (s, o) => ejecutarSuiteReal(s, { raiz, ...o }), entorno = process.env, comprobarEntorno = true,
  alTerminar = () => {},
} = {}) => {
  if (!['estatico', 'ejecutar'].includes(modo)) throw new Error(`modo desconocido: ${modo}`);
  if (!Number.isInteger(estabilidad) || estabilidad < 0 || estabilidad > MAX_ESTABILIDAD) throw new Error(`--estabilidad debe ser un entero entre 0 y ${MAX_ESTABILIDAD}`);
  const pkg = JSON.parse(fs.readFileSync(path.join(raiz, 'functions/package.json'), 'utf8'));
  const cadena = suitesDeLaCadena(pkg.scripts?.test).map((s) => s.replace(/^test\//, '').replace(/\.test\.mjs$/, ''));
  const mapa = leerMapa(raiz);
  const existe = (rel) => { try { return fs.statSync(path.join(raiz, rel)).isFile(); } catch { return false; } };
  const { problemas: pm, cobertura } = validarDominios({ mapa, cadena, existe });
  const huellas = verificarHuellas({ raiz });
  const problemas = [...pm, ...huellas.problemas];
  const elegidos = seleccionar(mapa, { dominios, criticos });

  const informe = {
    contrato: CONTRATO, modo, ejecucion: modo === 'ejecutar' ? 'ejecutada' : 'no-ejecutada',
    seleccion: dominios ? { dominios } : criticos ? { criticos: true } : { todos: true },
    cobertura: { suitesEnLaCadena: cobertura.total, sinDominio: cobertura.sinDominio, vigiladasPorVariosDominios: cobertura.multiples.length },
    problemas, entorno: { comprobado: false, motivos: [] }, dominios: [], pendientes: [], intermitentes: [], entornoNoVerificable: [],
  };

  /* Los dominios pendientes se informan SIEMPRE (no existe lo que verificar): jamás cuentan como verdes ocultos. */
  informe.pendientes = mapa.dominios.filter((d) => d.estado === 'pendiente').map((d) => ({ id: d.id, nombre: d.nombre, motivo: d.pendiente, cuandoExista: d.cuandoExista }));

  let entornoOk = true;
  if (modo === 'ejecutar' && comprobarEntorno) {
    const motivos = [];
    const lib = libDesfasado(path.join(raiz, 'functions'));
    const aviso = avisoDeLib(lib);
    if (aviso) motivos.push(aviso.split('\n')[0]);
    let secretos = [];
    try { secretos = (await import('../../scripts/emulators.mjs')).SECRETOS; } catch (e) { motivos.push(`no se pudo leer la lista de secretos (${e.message})`); }
    if (secretos.length) motivos.push(...motivosDeEntorno(entorno, secretos));
    informe.entorno = { comprobado: true, motivos };
    entornoOk = motivos.length === 0;
  }

  for (const d of elegidos) {
    const fila = { id: d.id, nombre: d.nombre, critico: d.critico, estado: 'PASA', suites: [] };
    if (d.estado === 'pendiente') { fila.estado = 'PENDIENTE'; informe.dominios.push(fila); continue; }
    if (modo === 'estatico') { fila.suites = d.suites.map((s) => ({ suite: s, estado: 'NO_EJECUTADA' })); informe.dominios.push(fila); continue; }
    if (!entornoOk) { fila.estado = 'ENTORNO'; fila.suites = d.suites.map((s) => ({ suite: s, estado: 'NO_EJECUTADA', motivo: 'el entorno no se puede verificar' })); informe.dominios.push(fila); continue; }
    informe.dominios.push(fila);
  }

  if (modo === 'ejecutar' && entornoOk) {
    /* Una suite puede estar en varios dominios: se ejecuta UNA vez y su resultado cuenta en todos. */
    const aEjecutar = [...new Set(elegidos.filter((d) => d.estado === 'activo').flatMap((d) => d.suites))];
    const resultados = new Map();
    const filas = await reparto(aEjecutar, paralelo, async (s) => {
      const r = estabilidad > 0 ? await medirEstabilidad(s, { ejecutarSuite, limiteMs, veces: estabilidad }) : await verificarSuite(s, { ejecutarSuite, limiteMs });
      alTerminar(r);
      return r;
    });
    filas.forEach((r) => resultados.set(r.suite, r));
    for (const f of informe.dominios) {
      if (f.estado === 'PENDIENTE' || f.estado === 'ENTORNO') continue;
      const d = elegidos.find((x) => x.id === f.id);
      f.suites = d.suites.map((s) => resultados.get(s));
      f.estado = peor(f.suites.map((s) => s.estado));
    }
    informe.intermitentes = filas.filter((r) => r.estado === 'INTERMITENTE').map((r) => r.suite);
    informe.entornoNoVerificable = filas.filter((r) => r.estado === 'ENTORNO').map((r) => r.suite);
  } else if (modo === 'ejecutar') {
    informe.entornoNoVerificable = ['(el entorno completo: ver entorno.motivos)'];
  }

  const estados = informe.dominios.map((f) => (f.estado === 'PENDIENTE' || f.estado === 'NO_EJECUTADA' ? 'PASA' : f.estado));
  let global = peor(estados);
  if (problemas.length) global = 'FALLA';
  else if (modo === 'ejecutar' && !entornoOk) global = 'ENTORNO';
  informe.resumen = {
    dominios: informe.dominios.length, suites: informe.dominios.reduce((n, f) => n + f.suites.length, 0),
    problemas: problemas.length, intermitentes: informe.intermitentes.length, entorno: informe.entornoNoVerificable.length,
    pendientes: informe.pendientes.length,
  };
  informe.resultado = global;
  informe.codigo = salidaDe(global);
  return informe;
};

/** Pura: el informe como Markdown (lo que va al resumen del job). */
export const aMarkdown = (r) => {
  const marca = (e) => ({ PASA: '✔', FALLA: '✘', INTERMITENTE: '⚠', ENTORNO: '⚠', PENDIENTE: '…', NO_EJECUTADA: '·' }[e] || '?');
  const l = [];
  l.push(`## Guardian · verificación por dominios — ${r.resultado === 'PASA' ? '✔ PASA' : `✘ ${r.resultado}`}`);
  l.push('');
  l.push(`Modo: **${r.modo}** · ${r.ejecucion === 'ejecutada' ? 'suites EJECUTADAS' : '**las suites NO se ejecutaron** (un verde estático no sustituye al Nivel 2 de la CI)'}`);
  l.push(`Suites en la cadena: ${r.cobertura.suitesEnLaCadena} · sin dominio: ${r.cobertura.sinDominio.length} · problemas del mapa/huellas: ${r.problemas.length}`);
  if (r.problemas.length) { l.push('', '### Problemas (cada uno bloquea)'); for (const p of r.problemas) l.push(`- \`${p.id}\` — ${p.mensaje}`); }
  if (r.entorno.comprobado && r.entorno.motivos.length) { l.push('', '### Entorno que no se puede verificar (ENTORNO: no es verde)'); for (const m of r.entorno.motivos) l.push(`- ${m}`); }
  l.push('', '### Dominios', '', '| | Dominio | Crítico | Suites | Estado |', '|---|---|---|---|---|');
  for (const f of r.dominios) l.push(`| ${marca(f.estado)} | ${f.nombre} (\`${f.id}\`) | ${f.critico ? 'sí' : 'no'} | ${f.suites.length} | ${f.estado} |`);
  const malas = r.dominios.flatMap((f) => f.suites.filter((s) => ['FALLA', 'INTERMITENTE', 'ENTORNO'].includes(s.estado)).map((s) => ({ ...s, dominio: f.id })));
  if (malas.length) {
    l.push('', '### Suites que no pasaron', '');
    for (const s of [...new Map(malas.map((x) => [x.suite, x])).values()]) {
      l.push(`- ${marca(s.estado)} **${s.suite}** — ${s.estado}${s.clase ? ` (${s.clase})` : ''}${s.motivo ? `: ${s.motivo}` : ''}`);
      const firma = s.evidencia?.primera?.firma;
      if (firma) l.push(`  - fallo: \`${firma.split('\n')[0].slice(0, 200)}\``);
      if (s.estabilidad) l.push(`  - estabilidad: ${s.estabilidad.fallos}/${s.estabilidad.veces} ejecuciones fallaron`);
    }
  }
  if (r.pendientes.length) { l.push('', '### Pendiente (nada que verificar todavía; se dice, no se oculta)', ''); for (const p of r.pendientes) l.push(`- **${p.nombre}** — ${p.motivo}`); }
  return `${l.join('\n')}\n`;
};

const principal = async () => {
  const args = process.argv.slice(2);
  const valor = (op) => { const i = args.indexOf(op); return i >= 0 ? args[i + 1] : undefined; };
  const raiz = path.resolve(valor('--raiz') || process.env.GUARDIAN_RAIZ || REPO);
  /* Los parámetros de un workflow_dispatch llegan por el ENTORNO (nunca como texto de un shell): se validan igual que los argumentos. */
  const delEntorno = (nombre) => { const v = String(process.env[nombre] || '').trim(); return v || undefined; };
  let informe;
  try {
    const lista = (v) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : null);
    informe = await verificar({
      raiz, modo: valor('--modo') || delEntorno('GUARDIAN_MODO') || 'estatico', dominios: lista(valor('--dominios') || delEntorno('GUARDIAN_DOMINIOS')), criticos: args.includes('--criticos'),
      paralelo: Number(valor('--paralelo') || 4), limiteMs: Number(valor('--limite-s') || LIMITE_POR_DEFECTO_S) * 1000,
      estabilidad: Number(valor('--estabilidad') || delEntorno('GUARDIAN_ESTABILIDAD') || 0),
      alTerminar: (r) => console.log(`${r.estado === 'PASA' ? '✔' : '✘'} ${r.suite} — ${r.estado}${r.clase && r.clase !== 'pasa' ? ` (${r.clase})` : ''} (${(r.ms / 1000).toFixed(1)} s)`),
    });
  } catch (e) {
    console.error(`✘ Guardian · verificación: FALLO — ${e.message}`);
    process.exitCode = SALIDA.ENTRADA;
    return;
  }
  const md = aMarkdown(informe);
  try {
    const j = valor('--json');
    const m = valor('--md');
    if (j) fs.writeFileSync(j, `${JSON.stringify(informe, null, 2)}\n`);
    if (m) fs.writeFileSync(m, md);
  } catch (e) {
    console.error(`✘ Guardian · verificación: no se pudo escribir el informe (${e.message}): sin evidencia no hay verde`);
    process.exitCode = SALIDA.ENTRADA;
    return;
  }
  console.log(md);
  process.exitCode = informe.codigo;
};
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await principal();
