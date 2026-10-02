#!/usr/bin/env node
/*
 * LA PROTECCIÓN DE MAIN Y DEL ENTORNO DE PRODUCCIÓN EN GITHUB — Weë Agent Harness.
 *
 *   node ops/github/proteccion.mjs            imprime los comandos (los ejecuta el DUEÑO)
 *   node ops/github/proteccion.mjs verificar  LEE la configuración de GitHub y dice si es esta
 *
 * Lo que se propone está en los JSON de esta carpeta, y es lo que se envía tal cual:
 *
 *  · ruleset-main.json — main no se borra, no se reescribe (sin force-push) y solo
 *    cambia por PR con los cuatro checks de la CI en verde, emitidos por GitHub
 *    Actions (integration_id 15368: un estado puesto por otra app no cuenta) y con
 *    la rama al día. Sin revisores obligatorios: el dueño trabaja solo, y GitHub no
 *    deja aprobar tu propio PR. Sin excepciones (bypass) para nadie.
 *    SOLO merge commits: `ops/permitido.mjs` comprueba por ASCENDENCIA que main
 *    contiene lo que está vivo; un squash o un rebase reescriben los commits y
 *    bloquearían todos los despliegues.
 *  · repositorio.json — lo mismo en los ajustes del repositorio: sin squash ni rebase.
 *  · acciones.json + acciones-permitidas.json — solo acciones de GitHub y la de
 *    autenticación de Google, y siempre fijadas por SHA completo.
 *  · permisos-de-workflows.json — el token de los workflows, de solo lectura, y
 *    sin poder aprobar PRs (ya es así hoy: se comprueba).
 *  · entorno-get-wee*.json — el entorno del despliegue: el dueño aprueba cada uno
 *    y solo desde main. «Impedir que apruebe quien lo lanza» queda APAGADO a
 *    propósito: el dueño lanza y aprueba.
 *
 * `verificar` solo hace GET (lo fija functions/test/proteccion-github.test.mjs).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORIO = 'geovetlf/wee-app';
export const ENTORNO = 'get-wee';
export const ACCIONES_DE_GITHUB = 15368;
const leerJson = (f) => JSON.parse(fs.readFileSync(path.join(AQUI, f), 'utf8'));
export const RULESET = leerJson('ruleset-main.json');
export const AJUSTES = leerJson('repositorio.json');
export const ACCIONES = leerJson('acciones.json');
export const ACCIONES_PERMITIDAS = leerJson('acciones-permitidas.json');
export const PERMISOS_DE_WORKFLOWS = leerJson('permisos-de-workflows.json');
export const ENTORNO_GET_WEE = leerJson('entorno-get-wee.json');
export const RAMA_DEL_ENTORNO = leerJson('entorno-get-wee-rama.json');

const R = `repos/${REPOSITORIO}`;
const archivo = (f) => `ops/github/${f}`;

/** Los comandos que ejecuta el dueño, en orden. Todos idempotentes salvo crear el ruleset (se crea una vez). */
export const comandos = () => [
  '# 1 · Solo merge commits (permitido.mjs comprueba por ascendencia)',
  `gh api --method PATCH ${R} --input ${archivo('repositorio.json')}`,
  '',
  '# 2 · Solo acciones de GitHub y la de Google, fijadas por SHA; el token de los workflows, de solo lectura',
  `gh api --method PUT ${R}/actions/permissions --input ${archivo('acciones.json')}`,
  `gh api --method PUT ${R}/actions/permissions/selected-actions --input ${archivo('acciones-permitidas.json')}`,
  `gh api --method PUT ${R}/actions/permissions/workflow --input ${archivo('permisos-de-workflows.json')}`,
  '',
  `# 3 · El entorno ${ENTORNO}: el dueño aprueba cada despliegue, y solo desde main`,
  `gh api --method PUT ${R}/environments/${ENTORNO} --input ${archivo('entorno-get-wee.json')}`,
  `gh api --method POST ${R}/environments/${ENTORNO}/deployment-branch-policies --input ${archivo('entorno-get-wee-rama.json')}`,
  '',
  '# 4 · main protegida (crear UNA vez; para cambiarla después: PUT …/rulesets/<id> con el mismo archivo)',
  `gh api --method POST ${R}/rulesets --input ${archivo('ruleset-main.json')}`,
  '',
  '# 5 · Comprobar: node ops/github/proteccion.mjs verificar',
];

/** Las lecturas de `verificar`: solo GET. */
export const LECTURAS = Object.freeze({
  rulesets: `${R}/rulesets`,
  repositorio: R,
  acciones: `${R}/actions/permissions`,
  accionesPermitidas: `${R}/actions/permissions/selected-actions`,
  permisos: `${R}/actions/permissions/workflow`,
  entorno: `${R}/environments/${ENTORNO}`,
  ramasDelEntorno: `${R}/environments/${ENTORNO}/deployment-branch-policies`,
});

const regla = (rs, tipo) => (rs?.rules || []).find((r) => r.type === tipo);

/** Pura: diferencias entre lo que hay en GitHub y lo propuesto (vacía = conforme). */
export const comparar = (l) => {
  const d = [];
  const rs = l.ruleset;
  if (!rs) d.push(`no hay ruleset «${RULESET.name}» en main`);
  else {
    if (rs.enforcement !== 'active') d.push(`el ruleset está «${rs.enforcement}», no activo`);
    if (rs.target !== 'branch') d.push('el ruleset no es de ramas');
    const incluye = rs.conditions?.ref_name?.include || [];
    if (!incluye.includes('~DEFAULT_BRANCH') && !incluye.includes('refs/heads/main')) d.push('el ruleset no cubre main');
    if ((rs.bypass_actors || []).length) d.push(`el ruleset tiene excepciones: ${rs.bypass_actors.map((b) => `${b.actor_type}:${b.actor_id}`).join(', ')}`);
    for (const t of ['deletion', 'non_fast_forward']) if (!regla(rs, t)) d.push(`falta la regla ${t}`);
    const pr = regla(rs, 'pull_request');
    if (!pr) d.push('main admite pushes directos (falta la regla pull_request)');
    else {
      const metodos = pr.parameters?.allowed_merge_methods;
      if (metodos && JSON.stringify([...metodos].sort()) !== '["merge"]') d.push(`el PR admite ${metodos.join(', ')}: solo «merge» (permitido.mjs comprueba por ascendencia)`);
    }
    const checks = regla(rs, 'required_status_checks');
    const esperados = RULESET.rules.find((r) => r.type === 'required_status_checks').parameters.required_status_checks;
    if (!checks) d.push('main no exige los checks de la CI');
    else {
      const vivos = checks.parameters?.required_status_checks || [];
      const faltan = esperados.filter((e) => !vivos.some((v) => v.context === e.context && v.integration_id === ACCIONES_DE_GITHUB));
      if (faltan.length) d.push(`faltan checks (o no exigen que los emita GitHub Actions): ${faltan.map((f) => f.context).join(', ')}`);
      if (!checks.parameters?.strict_required_status_checks_policy) d.push('no exige la rama al día con main antes de fusionar');
    }
  }

  const r = l.repositorio || {};
  if (r.allow_squash_merge !== false) d.push('el repositorio admite squash (reescribe commits)');
  if (r.allow_rebase_merge !== false) d.push('el repositorio admite rebase (reescribe commits)');
  if (r.allow_merge_commit !== true) d.push('el repositorio no admite merge commits');

  const a = l.acciones || {};
  if (a.enabled !== true) d.push('GitHub Actions está apagado (la CI no correría)');
  if (a.allowed_actions !== 'selected') d.push(`acciones permitidas: «${a.allowed_actions}», no solo las seleccionadas`);
  if (a.sha_pinning_required !== true) d.push('no exige acciones fijadas por SHA');
  const ap = l.accionesPermitidas || {};
  if (a.allowed_actions === 'selected') {
    if (ap.github_owned_allowed !== true) d.push('no admite las acciones de GitHub (checkout, setup-node…)');
    if (ap.verified_allowed) d.push('admite cualquier acción de «creador verificado»: solo las de la lista');
    if (JSON.stringify([...(ap.patterns_allowed || [])].sort()) !== JSON.stringify([...ACCIONES_PERMITIDAS.patterns_allowed].sort())) {
      d.push(`acciones de terceros admitidas: ${(ap.patterns_allowed || []).join(', ') || 'ninguna'}; se esperan ${ACCIONES_PERMITIDAS.patterns_allowed.join(', ')}`);
    }
  }
  const p = l.permisos || {};
  if (p.default_workflow_permissions !== 'read') d.push('el token de los workflows puede escribir por defecto');
  if (p.can_approve_pull_request_reviews !== false) d.push('los workflows pueden aprobar PRs');

  const e = l.entorno;
  if (!e) d.push(`no existe el entorno ${ENTORNO}`);
  else {
    const revisores = (e.protection_rules || []).filter((x) => x.type === 'required_reviewers').flatMap((x) => x.reviewers || []);
    if (!revisores.some((x) => x.type === 'User' && x.reviewer?.id === ENTORNO_GET_WEE.reviewers[0].id)) d.push('el dueño no es revisor obligatorio del entorno');
    if (e.deployment_branch_policy?.custom_branch_policies !== true) d.push('el entorno no limita las ramas que pueden desplegar');
    const ramas = (l.ramasDelEntorno?.branch_policies || []).map((b) => `${b.type || 'branch'}:${b.name}`);
    if (JSON.stringify(ramas) !== JSON.stringify(['branch:main'])) d.push(`ramas que pueden desplegar: ${ramas.join(', ') || 'ninguna'}; solo main`);
  }
  return d;
};

const leer = (ruta) => {
  const r = spawnSync('gh', ['api', ruta], { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv[2] === 'verificar') {
    console.log(`# Weë · ¿está ${REPOSITORIO} protegido como propone ops/github/? (solo lectura)\n`);
    const l = Object.fromEntries(Object.entries(LECTURAS).map(([k, ruta]) => [k, leer(ruta)]));
    const resumen = (l.rulesets || []).find((x) => x.name === RULESET.name);
    l.ruleset = resumen ? leer(`${LECTURAS.rulesets}/${resumen.id}`) : null;
    const d = comparar(l);
    if (!d.length) { console.log('✔ Conforme.'); process.exit(0); }
    for (const x of d) console.log(`✘ ${x}`);
    process.exit(1);
  }
  console.log(`# Weë · protección de main y del entorno ${ENTORNO}. LO EJECUTA EL DUEÑO, en orden; este script no cambia nada.\n`);
  for (const c of comandos()) console.log(c);
}
