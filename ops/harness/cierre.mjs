#!/usr/bin/env node
/*
 * EL CIERRE DE MISIÓN DEL WEË HARNESS (F4, «wrap-up») — `ops/harness/cierre.mjs`.
 *
 *   node ops/harness/cierre.mjs --mision m.json [--base origin/main | --sin-git] [--g3 g3.json] [--cadena cadena.log]
 *        [--suite test/x.test.mjs=x.log …] [--ci checks.json] [--pr pr.json] [--despliegues runs.json]
 *        [--tag prod/… …] [--json] [--escribir]
 *
 * No es un texto escrito por una IA: junta resultados REALES y los convierte en un cierre verificable.
 *  · La misión (objetivo, alcance, tareas, decisiones, riesgos, pendientes, bloqueos, diferidos) la declara una
 *    persona en JSON (contrato `wee-cierre@1`), con la fuente de cada cosa.
 *  · Las evidencias son salidas de herramientas que ya existen, cada una con su origen y su huella: git (solo
 *    lectura), la puerta G3 (`baseline.mjs --json`), la cadena (`_cadena.mjs`), una suite suelta, los check-runs
 *    de GitHub, `gh pr view --json`, `gh run list --json` del workflow de despliegue y el mensaje de un tag `prod/*`.
 *  · `cerrar` es pura: la misma misión con las mismas evidencias da el mismo cierre (no lleva la hora del reloj).
 *    Lo que no tiene evidencia es UNKNOWN y nunca se convierte en un «pasa».
 *  · El JSON es la fuente canónica; el Markdown sale de él. `--escribir` los guarda por la puerta de F3, como la
 *    extensión `cierre-de-mision`, en `ops/harness/.cache/cierre-de-mision/` (ignorado por git).
 * Observa y cierra; no manda: no aprueba, no despliega, no hace merge ni push, no escribe en git y no ejecuta más
 * que lecturas de git. Sale 0 si el cierre es VERIFIED, 1 con cualquier otro estado y 2 si la entrada no vale.
 * Lo fija functions/test/harness-cierre.test.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { RAIZ_POR_DEFECTO, cambiosDesde, git } from '../revision/comun.mjs';
import { NIVELES_DE_CI } from '../despliegue/plan.mjs';
import { CACHE, actuar, cargarRegistro, conCapacidad } from './extensiones.mjs';

export const CONTRATO = 'wee-cierre@1';
export const ESTADOS = Object.freeze(['DONE', 'VERIFIED', 'PENDING', 'BLOCKED', 'DEFERRED', 'UNKNOWN']);
/** Lo que una misión puede exigir para cerrarse. Lo que no exige se informa, pero no decide el estado final. */
export const EXIGIBLES = Object.freeze(['codigo', 'pruebas', 'puertas', 'ci', 'seguridad', 'pr', 'produccion']);
/** Lo que una persona puede declarar de una tarea. VERIFIED solo lo da una evidencia; UNKNOWN, la falta de ella. */
const DECLARABLES = ['DONE', 'PENDING', 'BLOCKED', 'DEFERRED'];
export const EXTENSION = 'cierre-de-mision';
export const PUERTA_G3 = 'revision-determinista/g3';
const SHA = /^[0-9a-f]{40}$/;

const esObjeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const texto = (x, max = 600) => typeof x === 'string' && x.trim().length > 0 && x.length <= max;
export const huellaDe = (contenido) => createHash('sha256').update(String(contenido)).digest('hex');

/* ── La misión: lo que declara una persona ──────────────────────────────── */

const LISTAS = ['decisiones', 'riesgos', 'pendientes', 'bloqueos', 'diferidos'];

/** El contrato de la misión. `{ valido, errores }`; nada fuera del contrato, nada sin fuente. */
export const validarMision = (m) => {
  if (!esObjeto(m)) return { valido: false, errores: ['la misión no es un objeto JSON'] };
  const e = [];
  for (const k of Object.keys(m)) if (!['contrato', 'mision', 'tareas', ...LISTAS].includes(k)) e.push(`campo desconocido: ${k}`);
  if (m.contrato !== CONTRATO) e.push(`contrato: tiene que ser ${CONTRATO}`);
  const mi = m.mision;
  if (!esObjeto(mi)) e.push('falta mision');
  else {
    for (const k of Object.keys(mi)) if (!['id', 'objetivo', 'alcance', 'fueraDeAlcance', 'desde', 'exige'].includes(k)) e.push(`mision: campo desconocido ${k}`);
    if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(String(mi.id))) e.push(`mision.id no válido: ${mi.id}`);
    if (!texto(mi.objetivo)) e.push('mision.objetivo: un texto');
    if (!Array.isArray(mi.alcance) || !mi.alcance.length || !mi.alcance.every((x) => texto(x))) e.push('mision.alcance: una lista de textos (lo autorizado)');
    if ('fueraDeAlcance' in mi && (!Array.isArray(mi.fueraDeAlcance) || !mi.fueraDeAlcance.every((x) => texto(x)))) e.push('mision.fueraDeAlcance: una lista de textos');
    if ('desde' in mi && !(typeof mi.desde === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(mi.desde) && !Number.isNaN(Date.parse(mi.desde)))) e.push('mision.desde: una fecha ISO en UTC (…Z)');
    /* Vacía no vale: una misión que no exige nada saldría VERIFIED sin evidencia, y la ausencia no es un «pasa». */
    if ('exige' in mi && (!Array.isArray(mi.exige) || !mi.exige.length || !mi.exige.every((x) => EXIGIBLES.includes(x)) || new Set(mi.exige).size !== mi.exige.length)) e.push(`mision.exige: una lista no vacía y sin repetir de ${EXIGIBLES.join(', ')}`);
  }
  if ('tareas' in m && !Array.isArray(m.tareas)) e.push('tareas: una lista');
  const ids = new Set();
  for (const t of Array.isArray(m.tareas) ? m.tareas : []) {
    if (!esObjeto(t)) { e.push('tareas: un elemento no es un objeto'); continue; }
    for (const k of Object.keys(t)) if (!['id', 'texto', 'estado', 'fuente', 'evidencia'].includes(k)) e.push(`tarea ${t.id}: campo desconocido ${k}`);
    if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(String(t.id))) e.push(`tarea: id no válido: ${t.id}`);
    else if (ids.has(t.id)) e.push(`tarea repetida: ${t.id}`);
    ids.add(t.id);
    if (!texto(t.texto)) e.push(`tarea ${t.id}: sin texto`);
    if (!DECLARABLES.includes(t.estado)) e.push(`tarea ${t.id}: el estado ${t.estado} no se declara (${DECLARABLES.join(', ')}; VERIFIED solo lo da una evidencia)`);
    if (!texto(t.fuente)) e.push(`tarea ${t.id}: sin fuente`);
    if ('evidencia' in t && (!Array.isArray(t.evidencia) || !t.evidencia.every((x) => EXIGIBLES.includes(x)))) e.push(`tarea ${t.id}: evidencia es una lista de ${EXIGIBLES.join(', ')}`);
  }
  for (const l of LISTAS) {
    if (!(l in m)) continue;
    if (!Array.isArray(m[l])) { e.push(`${l}: una lista`); continue; }
    for (const x of m[l]) {
      if (!esObjeto(x)) { e.push(`${l}: un elemento no es un objeto`); continue; }
      for (const k of Object.keys(x)) if (!['texto', 'fuente', 'para'].includes(k)) e.push(`${l}: campo desconocido ${k}`);
      if (!texto(x.texto)) e.push(`${l}: un elemento sin texto`);
      if (!texto(x.fuente)) e.push(`${l}: «${String(x.texto).slice(0, 40)}» sin fuente`);
      if ('para' in x && (l !== 'diferidos' || !texto(x.para, 80))) e.push(`${l}: «para» (a qué fase) solo vale en diferidos`);
    }
  }
  return { valido: e.length === 0, errores: e };
};

/* ── Las evidencias: salidas reales, con su origen y su huella ──────────── */

const evidencia = (id, tipo, origen, crudo, datos) => ({ id, tipo, origen: String(origen), huella: huellaDe(crudo), datos });

/** La salida de `node ops/revision/baseline.mjs --json`: la puerta G3, que en F3 es `revision-determinista/g3`. */
export const evidenciaDeG3 = (crudo, origen) => {
  const j = JSON.parse(crudo);
  if (!esObjeto(j) || !esObjeto(j.puerta) || !Number.isInteger(j.puerta.codigo)) throw new Error(`${origen}: no es la salida de baseline.mjs --json`);
  return evidencia('g3', 'g3', origen, crudo, { puerta: PUERTA_G3, codigo: j.puerta.codigo, motivos: Array.isArray(j.puerta.motivos) ? j.puerta.motivos.map(String) : [], porEstado: esObjeto(j.porEstado) ? j.porEstado : {} });
};

/** El registro de `node test/_cadena.mjs`: el resumen final y lo que pasó con cada suite. */
export const evidenciaDeCadena = (crudo, origen) => {
  const lineas = String(crudo).split(/\r?\n/);
  const resumen = lineas.map((l) => /^(✔|✘) (\d+)\/(\d+) suites/.exec(l)).filter(Boolean).pop();
  if (!resumen) throw new Error(`${origen}: no es el registro de _cadena.mjs (falta «✔|✘ X/N suites»)`);
  const porSuite = {};
  for (const l of lineas) {
    const s = /^(✔|✘) \[\s*\d+\/\d+\] (test\/\S+) \(/.exec(l);
    if (s) porSuite[s[2]] = s[1] === '✔';
    const sola = /^✔ \[sola\] (test\/\S+) pasó al repetirla sola/.exec(l);
    if (sola) porSuite[sola[1]] = true;
  }
  const fallidas = Object.entries(porSuite).filter(([, ok]) => !ok).map(([s]) => s).sort();
  return evidencia('cadena', 'cadena', origen, crudo, { total: Number(resumen[3]), ok: Number(resumen[2]), fallidas, porSuite });
};

/** La salida de una suite suelta: sus ✔/✘ y su línea final («✔ todo bien» o «✘ N fallo(s)»). */
export const evidenciaDeSuite = (crudo, suite, origen) => {
  if (!/^test\/[a-z0-9][a-z0-9-]*\.(test|emulator)\.mjs$/.test(String(suite))) throw new Error(`suite no válida: ${suite}`);
  const lineas = String(crudo).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const final = lineas[lineas.length - 1] || '';
  if (!/^✔ todo bien$|^✘ \d+ fallo\(s\)$/.test(final)) throw new Error(`${origen}: la salida de ${suite} no termina en «✔ todo bien» ni en «✘ N fallo(s)»: incompleta`);
  const fallidas = lineas.filter((l) => /^✘ /.test(l) && l !== final).map((l) => l.slice(2, 120));
  return evidencia(`suite:${suite}`, 'suite', origen, crudo, { suite, ok: final === '✔ todo bien' && !fallidas.length, comprobaciones: lineas.filter((l) => /^✔ /.test(l) && l !== final).length, fallidas });
};

/** `gh api repos/<repo>/commits/<sha>/check-runs`: el nombre, el estado y la conclusión de cada check. */
export const evidenciaDeCI = (crudo, origen) => {
  const j = JSON.parse(crudo);
  if (!esObjeto(j) || !Array.isArray(j.check_runs)) throw new Error(`${origen}: no es la respuesta de check-runs de GitHub`);
  const comprobaciones = j.check_runs.map((c) => ({ nombre: String(c.name), status: String(c.status), conclusion: c.conclusion == null ? null : String(c.conclusion), commit: String(c.head_sha || '') }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  return evidencia('ci', 'ci', origen, crudo, { commits: [...new Set(comprobaciones.map((c) => c.commit).filter(Boolean))].sort(), comprobaciones });
};

/** `gh pr view <n> --json number,url,state,headRefOid,headRefName,baseRefName,mergedAt,mergeCommit`. */
export const evidenciaDePR = (crudo, origen) => {
  const j = JSON.parse(crudo);
  if (!esObjeto(j) || !Number.isInteger(j.number) || !SHA.test(String(j.headRefOid || ''))) throw new Error(`${origen}: no es la salida de gh pr view --json (number, headRefOid…)`);
  return evidencia('pr', 'pr', origen, crudo, {
    numero: j.number, url: j.url ? String(j.url) : null, estado: j.state ? String(j.state) : null, head: j.headRefOid,
    rama: j.headRefName ? String(j.headRefName) : null, base: j.baseRefName ? String(j.baseRefName) : null,
    fusionadoEn: j.mergedAt || null, commitDeMerge: j.mergeCommit && SHA.test(String(j.mergeCommit.oid)) ? j.mergeCommit.oid : null,
  });
};

/** `gh run list --workflow despliegue.yml --json databaseId,createdAt,status,conclusion,headSha`. */
export const evidenciaDeDespliegues = (crudo, origen) => {
  const j = JSON.parse(crudo);
  if (!Array.isArray(j) || !j.every((r) => esObjeto(r) && r.databaseId && r.createdAt)) throw new Error(`${origen}: no es la salida de gh run list --json (databaseId, createdAt…)`);
  const runs = j.map((r) => ({ id: Number(r.databaseId), creado: String(r.createdAt), status: String(r.status || ''), conclusion: r.conclusion ? String(r.conclusion) : null, commit: String(r.headSha || '') }))
    .sort((a, b) => a.id - b.id);
  return evidencia('despliegues', 'despliegues', origen, crudo, { runs });
};

/** `git cat-file -p prod/…`: el registro que el workflow de despliegue escribe en el tag. */
export const evidenciaDeTag = (crudo, nombre, origen = `git cat-file -p ${nombre}`) => {
  const t = String(crudo);
  const objeto = /^object ([0-9a-f]{40})$/m.exec(t);
  if (!objeto || !/^type commit$/m.test(t) || !/^Desplegado en get-wee: /m.test(t)) throw new Error(`${nombre}: no es un tag de despliegue anotado`);
  const revisiones = [...t.matchAll(/^función (\S+): revisión (\S+) · imagen \S+@(sha256:[0-9a-f]{64})/gm)].map((m) => ({ funcion: m[1], revision: m[2], digest: m[3] }));
  return evidencia(`tag:${nombre}`, 'tag', origen, t, {
    tag: nombre, commit: objeto[1], objetivo: (/^Desplegado en get-wee: (.+)$/m.exec(t) || [])[1] || null,
    workflow: (/^Workflow: (\S+)$/m.exec(t) || [])[1] || null, revisiones,
  });
};

/** Git, solo lectura: el commit, la rama, la base y lo que cambió desde ella (incluido lo que aún no tiene commit). */
export const evidenciaDeGit = (raiz, base = 'origin/main') => {
  const commit = String(git(raiz, ['rev-parse', 'HEAD'])).trim();
  const rama = String(git(raiz, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
  const baseSha = String(git(raiz, ['rev-parse', `${base}^{commit}`])).trim();
  /* Lo que git ya sigue (diff contra la base) y lo nuevo que aún no sigue (`?`): un árbol sucio nunca dice «0 archivos». */
  const sinSeguir = String(git(raiz, ['ls-files', '--others', '--exclude-standard', '-z'])).split('\0').filter(Boolean).map((r) => ({ ruta: r.replace(/\\/g, '/'), cambio: '?' }));
  const archivos = [...cambiosDesde(raiz, base).map((c) => ({ ruta: c.ruta, cambio: c.estado })), ...sinSeguir].sort((a, b) => a.ruta.localeCompare(b.ruta));
  const limpio = String(git(raiz, ['status', '--porcelain'])).trim() === '';
  const datos = { commit, rama, base, baseSha, archivos, limpio };
  return evidencia('git', 'git', 'git (solo lectura)', JSON.stringify(datos), datos);
};

/* ── El cierre: puro y determinista ─────────────────────────────────────── */

const item = (estado, valor, fuente = [], nota) => ({ estado, valor: valor === undefined ? null : valor, fuente: [...fuente].sort(), ...(nota ? { nota } : {}) });
const sinEvidencia = (nota) => item('UNKNOWN', null, [], nota);
/** El peor de varios estados: un fallo manda sobre lo pendiente, y lo pendiente sobre lo que no se sabe. */
const agregado = (estados) => {
  if (!estados.length) return 'UNKNOWN';
  for (const e of ['BLOCKED', 'PENDING', 'UNKNOWN']) if (estados.includes(e)) return e;
  return estados.every((e) => e === 'VERIFIED') ? 'VERIFIED' : 'DONE';
};
const estadoDeCheck = (c) => {
  if (!c) return { estado: 'UNKNOWN', nota: 'no aparece en la evidencia' };
  if (c.status !== 'completed') return { estado: 'PENDING', nota: `en curso (${c.status})` };
  if (c.conclusion === 'success') return { estado: 'VERIFIED' };
  if (['skipped', 'neutral', null].includes(c.conclusion)) return { estado: 'UNKNOWN', nota: `no corrió (${c.conclusion})` };
  return { estado: 'BLOCKED', nota: c.conclusion };
};

/**
 * Misión + evidencias → el cierre canónico. Lanza si la misión no cumple el contrato o si dos evidencias distintas
 * dicen ser la misma. `registro` (el de F3) dice qué puertas están registradas: cada una sale, con evidencia o UNKNOWN.
 */
export const cerrar = (mision, evidencias = [], { registro = null } = {}) => {
  const { valido, errores } = validarMision(mision);
  if (!valido) throw new Error(`la misión no cumple ${CONTRATO}: ${errores.join(' · ')}`);
  const porId = {};
  for (const ev of evidencias) {
    if (porId[ev.id] && porId[ev.id].huella !== ev.huella) throw new Error(`dos evidencias distintas con el mismo id: ${ev.id}`);
    porId[ev.id] = ev;
  }
  const lista = Object.values(porId).sort((a, b) => a.id.localeCompare(b.id));
  const contradicciones = [];
  const g = porId.git && porId.git.datos;

  const codigo = g ? {
    commit: item('VERIFIED', g.commit, ['git']),
    rama: item('VERIFIED', g.rama, ['git']),
    base: item('VERIFIED', { ref: g.base, sha: g.baseSha }, ['git']),
    archivos: item('VERIFIED', g.archivos, ['git']),
    limpio: g.limpio ? item('VERIFIED', true, ['git']) : item('PENDING', false, ['git'], 'hay cambios sin commit: no están en el commit'),
  } : Object.fromEntries(['commit', 'rama', 'base', 'archivos', 'limpio'].map((k) => [k, sinEvidencia('sin evidencia de git')]));
  const estadoDelCodigo = agregado([codigo.commit.estado, codigo.limpio.estado]);

  const cadena = porId.cadena && porId.cadena.datos;
  const suites = lista.filter((e) => e.tipo === 'suite');
  for (const s of suites) {
    if (cadena && s.datos.suite in cadena.porSuite && cadena.porSuite[s.datos.suite] !== s.datos.ok) {
      contradicciones.push({ sobre: `pruebas: ${s.datos.suite}`, fuentes: ['cadena', s.id], detalle: `la cadena dice ${cadena.porSuite[s.datos.suite] ? 'pasa' : 'falla'} y la suite suelta dice ${s.datos.ok ? 'pasa' : 'falla'}` });
    }
  }
  const pruebasEstados = [...(cadena ? [cadena.ok === cadena.total && !cadena.fallidas.length ? 'VERIFIED' : 'BLOCKED'] : []), ...suites.map((s) => (s.datos.ok ? 'VERIFIED' : 'BLOCKED'))];
  const pruebas = pruebasEstados.length ? item(agregado(pruebasEstados), {
    cadena: cadena ? { total: cadena.total, ok: cadena.ok, fallidas: cadena.fallidas } : null,
    suites: suites.map((s) => ({ suite: s.datos.suite, ok: s.datos.ok, comprobaciones: s.datos.comprobaciones, fallidas: s.datos.fallidas })),
  }, [...(cadena ? ['cadena'] : []), ...suites.map((s) => s.id)]) : sinEvidencia('ninguna prueba con evidencia: NOT TESTED');

  const registradas = registro ? conCapacidad(registro, 'comprobacion').flatMap((e) => e.manifiesto.capacidades.comprobacion.map((a) => `${e.id}/${a.id}`)) : [];
  const deEvidencia = lista.filter((e) => e.datos && e.datos.puerta);
  const puertas = [...new Set([...registradas, ...deEvidencia.map((e) => e.datos.puerta)])].sort().map((id) => {
    const ev = deEvidencia.find((e) => e.datos.puerta === id);
    if (!ev) return { id, ...sinEvidencia('registrada en F3, sin evidencia en este cierre') };
    const estado = ev.datos.codigo === 0 ? 'VERIFIED' : ev.datos.codigo === 1 ? 'BLOCKED' : 'UNKNOWN';
    return { id, ...item(estado, { codigo: ev.datos.codigo, motivos: ev.datos.motivos }, [ev.id], estado === 'UNKNOWN' ? 'la puerta no pudo decidir (código 2)' : undefined) };
  });

  const ci = porId.ci && porId.ci.datos;
  let ciItem = sinEvidencia('sin evidencia de CI');
  let seguridad = sinEvidencia('sin evidencia de CI (la seguridad es el Nivel 3)');
  if (ci) {
    const niveles = NIVELES_DE_CI.map((nombre) => ({ nombre, ...estadoDeCheck(ci.comprobaciones.find((c) => c.nombre === nombre)) }));
    const otroCommit = g && !(ci.commits.length === 1 && ci.commits[0] === g.commit);
    if (otroCommit) contradicciones.push({ sobre: 'ci', fuentes: ['ci', 'git'], detalle: `la CI es de ${ci.commits.join(', ') || 'ningún commit'} y el cierre es de ${g.commit}` });
    ciItem = otroCommit ? item('UNKNOWN', { niveles }, ['ci', 'git'], 'la CI no es del commit de este cierre') : item(agregado(niveles.map((n) => n.estado)), { niveles }, ['ci']);
    const n3 = niveles[3];
    seguridad = otroCommit ? item('UNKNOWN', { nivel: n3.nombre }, ['ci', 'git'], 'la CI no es del commit de este cierre') : item(n3.estado, { nivel: n3.nombre }, ['ci'], n3.nota);
  }

  const pr = porId.pr && porId.pr.datos;
  let prItem = sinEvidencia('sin evidencia de PR');
  if (pr) {
    const otro = g && pr.head !== g.commit;
    if (otro) contradicciones.push({ sobre: 'pr', fuentes: ['pr', 'git'], detalle: `el PR #${pr.numero} apunta a ${pr.head} y el cierre es de ${g.commit}` });
    prItem = item(otro ? 'UNKNOWN' : 'VERIFIED', pr, otro ? ['git', 'pr'] : ['pr'], otro ? 'el PR no apunta al commit de este cierre' : undefined);
  }

  const tags = lista.filter((e) => e.tipo === 'tag');
  const runs = porId.despliegues && porId.despliegues.datos;
  const desde = mision.mision.desde || null;
  const propios = runs && desde ? runs.runs.filter((r) => Date.parse(r.creado) >= Date.parse(desde)) : null;
  let produccion;
  if (tags.length) {
    produccion = item('VERIFIED', { estado: 'DEPLOYED', despliegues: tags.map((t) => t.datos) }, tags.map((t) => t.id));
    if (propios && !propios.length) contradicciones.push({ sobre: 'produccion', fuentes: ['despliegues', ...tags.map((t) => t.id)].sort(), detalle: `hay tag de despliegue pero ningún run de despliegue desde ${desde}` });
  } else if (runs && !desde) {
    produccion = sinEvidencia('hay runs de despliegue, pero sin mision.desde no se sabe cuáles son de esta misión');
  } else if (runs) {
    if (!propios.length) produccion = item('VERIFIED', { estado: 'NOT DEPLOYED', desde }, ['despliegues']);
    else if (propios.some((r) => r.status !== 'completed')) produccion = item('PENDING', { estado: 'DEPLOYING', runs: propios }, ['despliegues']);
    else if (propios.every((r) => r.conclusion === 'success')) produccion = item('VERIFIED', { estado: 'DEPLOYED', runs: propios }, ['despliegues']);
    else produccion = item('BLOCKED', { estado: 'DEPLOY FAILED', runs: propios }, ['despliegues']);
  } else produccion = sinEvidencia('sin evidencia de despliegue');
  if (contradicciones.some((c) => c.sobre === 'produccion')) produccion = { ...produccion, estado: 'UNKNOWN', nota: 'las evidencias de despliegue se contradicen' };

  const verdad = { codigo: estadoDelCodigo, pruebas: pruebas.estado, puertas: agregado(puertas.map((p) => p.estado)), ci: ciItem.estado, seguridad: seguridad.estado, pr: prItem.estado, produccion: produccion.estado };
  const tareas = (mision.tareas || []).map((t) => {
    const base = { id: t.id, texto: t.texto, fuente: [t.fuente], evidencia: t.evidencia || [] };
    if (t.estado !== 'DONE') return { ...base, estado: t.estado };
    /* Hecha según una persona (su fuente), sin evidencia de máquina: DONE, nunca VERIFIED. */
    if (!base.evidencia.length) return { ...base, estado: 'DONE', nota: 'hecha según su fuente; ninguna evidencia de máquina la verifica' };
    const estados = base.evidencia.map((x) => verdad[x]);
    if (estados.includes('BLOCKED')) return { ...base, estado: 'BLOCKED', nota: 'su evidencia falla' };
    if (estados.some((s) => s === 'UNKNOWN' || s === 'PENDING')) return { ...base, estado: 'UNKNOWN', nota: 'su evidencia no está o no es concluyente' };
    return { ...base, estado: estados.every((s) => s === 'VERIFIED') ? 'VERIFIED' : 'DONE' };
  });
  const declarada = (l, estado) => (mision[l] || []).map((x) => ({ texto: x.texto, fuente: [x.fuente], ...(x.para ? { para: x.para } : {}), ...(estado ? { estado } : {}) }));

  /* El estado final, siempre por las mismas reglas y en este orden. */
  const exige = [...(mision.mision.exige || ['codigo'])].sort();
  const motivos = [];
  const bloqueadas = [...Object.entries(verdad).filter(([, s]) => s === 'BLOCKED').map(([k]) => k), ...tareas.filter((t) => t.estado === 'BLOCKED').map((t) => `tarea ${t.id}`)];
  const pendientes = [...Object.entries(verdad).filter(([, s]) => s === 'PENDING').map(([k]) => k), ...tareas.filter((t) => t.estado === 'PENDING').map((t) => `tarea ${t.id}`)];
  const desconocidas = exige.filter((k) => verdad[k] === 'UNKNOWN');
  let estado;
  if (bloqueadas.length || (mision.bloqueos || []).length) { estado = 'BLOCKED'; motivos.push(...bloqueadas.map((k) => `${k}: BLOCKED`), ...(mision.bloqueos || []).map((b) => `bloqueo declarado: ${b.texto}`)); }
  else if (contradicciones.length) { estado = 'UNKNOWN'; motivos.push(...contradicciones.map((c) => `contradicción en ${c.sobre}`)); }
  else if (pendientes.length || (mision.pendientes || []).length) { estado = 'PENDING'; motivos.push(...pendientes.map((k) => `${k}: PENDING`), ...(mision.pendientes || []).map((p) => `pendiente declarado: ${p.texto}`)); }
  else if (tareas.length && tareas.every((t) => t.estado === 'DEFERRED')) { estado = 'DEFERRED'; motivos.push('todas las tareas están diferidas con autorización'); }
  else if (desconocidas.length || tareas.some((t) => t.estado === 'UNKNOWN')) { estado = 'UNKNOWN'; motivos.push(...desconocidas.map((k) => `exige ${k} y no hay evidencia que lo decida`), ...tareas.filter((t) => t.estado === 'UNKNOWN').map((t) => `tarea ${t.id}: ${t.nota}`)); }
  else if (exige.every((k) => verdad[k] === 'VERIFIED') && tareas.every((t) => ['VERIFIED', 'DEFERRED'].includes(t.estado))) { estado = 'VERIFIED'; motivos.push(`verificado: ${exige.join(', ')}`); }
  else { estado = 'DONE'; motivos.push('hecho, pero no todo lo hecho está verificado por una evidencia'); }

  return {
    contrato: CONTRATO,
    mision: { id: mision.mision.id, objetivo: mision.mision.objetivo, alcance: mision.mision.alcance, fueraDeAlcance: mision.mision.fueraDeAlcance || [], desde, exige },
    estadoFinal: { estado, motivos },
    codigo, pruebas, puertas, ci: ciItem, seguridad, pr: prItem, produccion,
    tareas,
    decisiones: declarada('decisiones'), riesgos: declarada('riesgos'),
    pendientes: declarada('pendientes', 'PENDING'), bloqueos: declarada('bloqueos', 'BLOCKED'), diferidos: declarada('diferidos', 'DEFERRED'),
    contradicciones: contradicciones.sort((a, b) => a.sobre.localeCompare(b.sobre)),
    evidencias: lista.map((e) => ({ id: e.id, tipo: e.tipo, origen: e.origen, huella: e.huella })),
  };
};

/** El JSON canónico (el orden de las claves lo fija `cerrar`) y su huella. */
export const aJSON = (cierre) => `${JSON.stringify(cierre, null, 2)}\n`;
export const huellaDelCierre = (cierre) => huellaDe(JSON.stringify(cierre));

/* ── El Markdown: SOLO a partir del JSON ────────────────────────────────── */

const celda = (x) => String(x === null || x === undefined ? '—' : typeof x === 'object' ? JSON.stringify(x) : x).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const fila = (nombre, it) => `| ${nombre} | ${it.estado} | ${celda(it.valor)} | ${it.fuente.length ? it.fuente.join(', ') : '—'}${it.nota ? ` · ${celda(it.nota)}` : ''} |`;

export const aMarkdown = (cierre) => {
  const c = cierre;
  const md = [`# Cierre de misión · ${c.mision.id} — ${c.estadoFinal.estado}`, '', `**Objetivo:** ${c.mision.objetivo}`, '', '**Alcance autorizado:**', ...c.mision.alcance.map((a) => `- ${a}`)];
  if (c.mision.fueraDeAlcance.length) md.push('', '**Fuera de alcance:**', ...c.mision.fueraDeAlcance.map((a) => `- ${a}`));
  md.push('', `## Estado final: ${c.estadoFinal.estado}`, '', ...c.estadoFinal.motivos.map((m) => `- ${m}`), `- exige: ${c.mision.exige.join(', ')}`);
  md.push('', '## Resultados', '', '| Qué | Estado | Valor | Fuente |', '|---|---|---|---|',
    fila('Commit', c.codigo.commit), fila('Rama', c.codigo.rama), fila('Base', c.codigo.base), fila('Árbol limpio', c.codigo.limpio),
    fila('Pruebas', c.pruebas), ...c.puertas.map((p) => fila(`Puerta ${p.id}`, p)), fila('CI', c.ci), fila('Seguridad', c.seguridad),
    fila('PR', c.pr), fila('Producción', c.produccion));
  md.push('', `## Archivos modificados (${Array.isArray(c.codigo.archivos.valor) ? c.codigo.archivos.valor.length : 'UNKNOWN'})`, '');
  md.push(...(Array.isArray(c.codigo.archivos.valor) ? c.codigo.archivos.valor.map((a) => `- \`${a.cambio}\` ${a.ruta}`) : ['- UNKNOWN: sin evidencia de git']));
  if (c.tareas.length) md.push('', '## Tareas', '', '| Tarea | Estado | Fuente | Nota |', '|---|---|---|---|', ...c.tareas.map((t) => `| ${celda(t.texto)} | ${t.estado} | ${celda(t.fuente.join(', '))} | ${celda(t.nota || '')} |`));
  for (const [titulo, clave] of [['Decisiones', 'decisiones'], ['Riesgos', 'riesgos'], ['Pendientes', 'pendientes'], ['Bloqueos', 'bloqueos'], ['Diferidos', 'diferidos']]) {
    if (c[clave].length) md.push('', `## ${titulo}`, '', ...c[clave].map((x) => `- ${x.texto}${x.para ? ` (para ${x.para})` : ''} — _fuente: ${x.fuente.join(', ')}_`));
  }
  if (c.contradicciones.length) md.push('', '## Contradicciones', '', ...c.contradicciones.map((x) => `- **${x.sobre}** (${x.fuentes.join(' vs ')}): ${x.detalle}`));
  md.push('', '## Evidencias', '', '| Id | Tipo | Origen | Huella |', '|---|---|---|---|', ...(c.evidencias.length ? c.evidencias.map((e) => `| ${e.id} | ${e.tipo} | ${celda(e.origen)} | \`${e.huella.slice(0, 12)}\` |`) : ['| — | — | ninguna | — |']));
  md.push('', `_Sale de cierre.json (contrato ${c.contrato}, huella \`${huellaDelCierre(c).slice(0, 16)}\`). No lo escribió una IA: si algo no tiene evidencia, dice UNKNOWN._`, '');
  return md.join('\n');
};

/* ── Guardar, por la puerta de F3 ───────────────────────────────────────── */

/** Escribe el JSON y el Markdown como la extensión `cierre-de-mision`, por `actuar` de F3. Nada más se puede escribir. */
export const guardar = (cierre, { registro, raiz = RAIZ_POR_DEFECTO } = {}) => {
  const reg = registro || cargarRegistro({ raiz });
  return [['cierre.json', aJSON(cierre)], ['cierre.md', aMarkdown(cierre)]].map(([archivo, contenido]) => {
    const r = actuar(reg, EXTENSION, { tipo: 'escribir', ruta: `${CACHE}/${EXTENSION}/${archivo}` }, { raiz, contenido });
    return { archivo, hecho: r.hecho, motivo: r.motivo };
  });
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const valores = (op) => args.flatMap((a, i) => (a === op && args[i + 1] !== undefined ? [args[i + 1]] : []));
  const valor = (op) => valores(op)[0];
  const raiz = RAIZ_POR_DEFECTO;
  try {
    if (!valor('--mision')) throw new Error('falta --mision m.json');
    const mision = JSON.parse(fs.readFileSync(path.resolve(valor('--mision')), 'utf8'));
    const leer = (p) => fs.readFileSync(path.resolve(p), 'utf8');
    const evidencias = [];
    if (!args.includes('--sin-git')) evidencias.push(evidenciaDeGit(raiz, valor('--base') || 'origin/main'));
    if (valor('--g3')) evidencias.push(evidenciaDeG3(leer(valor('--g3')), valor('--g3')));
    if (valor('--cadena')) evidencias.push(evidenciaDeCadena(leer(valor('--cadena')), valor('--cadena')));
    for (const s of valores('--suite')) { const i = s.indexOf('='); evidencias.push(evidenciaDeSuite(leer(s.slice(i + 1)), s.slice(0, i), s.slice(i + 1))); }
    if (valor('--ci')) evidencias.push(evidenciaDeCI(leer(valor('--ci')), valor('--ci')));
    if (valor('--pr')) evidencias.push(evidenciaDePR(leer(valor('--pr')), valor('--pr')));
    if (valor('--despliegues')) evidencias.push(evidenciaDeDespliegues(leer(valor('--despliegues')), valor('--despliegues')));
    for (const t of valores('--tag')) evidencias.push(evidenciaDeTag(String(git(raiz, ['cat-file', '-p', t])), t));
    const registro = cargarRegistro({ raiz });
    const cierre = cerrar(mision, evidencias, { registro });
    process.stdout.write(args.includes('--json') ? aJSON(cierre) : `${aMarkdown(cierre)}`);
    if (args.includes('--escribir')) {
      for (const r of guardar(cierre, { registro, raiz })) console.error(`${r.hecho ? '✔' : '✘'} ${r.archivo}: ${r.hecho ? `${CACHE}/${EXTENSION}/${r.archivo}` : r.motivo}`);
    }
    process.exit(cierre.estadoFinal.estado === 'VERIFIED' ? 0 : 1);
  } catch (e) {
    console.error(`✘ ${e.message}`);
    process.exit(2);
  }
}
