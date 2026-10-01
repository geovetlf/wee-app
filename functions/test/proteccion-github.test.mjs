/*
 * LA PROTECCIÓN DE MAIN EN GITHUB — `ops/github/`.
 *
 * Lo que se propone tiene que encajar con lo que ya hay: los checks que exige main
 * son los cuatro trabajos de la CI (y los que exige el workflow de despliegue), el
 * único método de fusión no rompe `ops/permitido.mjs`, las acciones permitidas son
 * exactamente las que usan los workflows (y todas van fijadas por SHA, o exigirlo
 * rompería la CI), el revisor del entorno es el dueño de wif.mjs y el entorno es el
 * del workflow. Y `verificar` solo lee.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const importar = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const g = await importar('ops/github/proteccion.mjs');
const { NIVELES_DE_CI } = await importar('ops/despliegue/plan.mjs');
const wif = await importar('ops/iam/wif.mjs');
const regla = (tipo) => g.RULESET.rules.find((r) => r.type === tipo);

/* ── 1. El ruleset ───────────────────────────────────────────────────────── */
const checks = regla('required_status_checks')?.parameters;
check('1) main exige EXACTAMENTE los cuatro checks de la CI, emitidos por GitHub Actions (15368), con la rama al día',
  JSON.stringify(checks.required_status_checks.map((c) => c.context)) === JSON.stringify(NIVELES_DE_CI)
  && checks.required_status_checks.every((c) => c.integration_id === 15368) && checks.strict_required_status_checks_policy === true);
const pr = regla('pull_request')?.parameters;
check('2) main solo cambia por PR, y SOLO con merge commit (squash o rebase romperían permitido.mjs)',
  !!pr && JSON.stringify(pr.allowed_merge_methods) === '["merge"]' && /merge-base', '--is-ancestor'/.test(leer('ops/permitido.mjs')));
check('3) sin revisores obligatorios (el dueño trabaja solo y GitHub no deja aprobar tu propio PR) y sin excepciones para nadie',
  pr.required_approving_review_count === 0 && g.RULESET.bypass_actors.length === 0);
check('4) main no se borra ni se reescribe', !!regla('deletion') && !!regla('non_fast_forward'));
check('5) el ruleset cubre la rama por defecto y está activo', g.RULESET.enforcement === 'active' && g.RULESET.target === 'branch'
  && JSON.stringify(g.RULESET.conditions.ref_name.include) === '["~DEFAULT_BRANCH"]');
check('6) los ajustes del repositorio dicen lo mismo: merge commits sí, squash y rebase no',
  g.AJUSTES.allow_merge_commit === true && g.AJUSTES.allow_squash_merge === false && g.AJUSTES.allow_rebase_merge === false);

/* ── 2. Las acciones ─────────────────────────────────────────────────────── */
const workflows = fs.readdirSync(path.join(RAIZ, '.github/workflows')).map((f) => leer(`.github/workflows/${f}`)).join('\n');
const usos = [...workflows.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map((m) => m[1]);
const deTerceros = [...new Set(usos.filter((u) => !u.startsWith('actions/')).map((u) => u.split('@')[0]))].sort();
check('7) exigir SHA no rompe la CI: TODAS las acciones de los workflows van fijadas por SHA completo',
  usos.length > 0 && usos.every((u) => /@[0-9a-f]{40}$/.test(u)), usos.filter((u) => !/@[0-9a-f]{40}$/.test(u)).join(', '));
check('8) las acciones de terceros permitidas son EXACTAMENTE las que usan los workflows',
  JSON.stringify(g.ACCIONES_PERMITIDAS.patterns_allowed.map((p) => p.replace(/@\*$/, '')).sort()) === JSON.stringify(deTerceros)
  && g.ACCIONES_PERMITIDAS.github_owned_allowed === true && g.ACCIONES_PERMITIDAS.verified_allowed === false, deTerceros.join(', '));
check('9) solo las seleccionadas, con SHA obligatorio; el token de los workflows, de lectura y sin aprobar PRs',
  g.ACCIONES.allowed_actions === 'selected' && g.ACCIONES.sha_pinning_required === true
  && g.PERMISOS_DE_WORKFLOWS.default_workflow_permissions === 'read' && g.PERMISOS_DE_WORKFLOWS.can_approve_pull_request_reviews === false);

/* ── 3. El entorno ───────────────────────────────────────────────────────── */
check('10) el entorno es el del workflow y el de WIF, el revisor es el dueño de wif.mjs y solo despliega main',
  g.ENTORNO === wif.ENTORNO && /environment:\s*get-wee/.test(leer('.github/workflows/despliegue.yml'))
  && g.ENTORNO_GET_WEE.reviewers.length === 1 && String(g.ENTORNO_GET_WEE.reviewers[0].id) === wif.DUENO_ID
  && g.ENTORNO_GET_WEE.deployment_branch_policy.custom_branch_policies === true
  && JSON.stringify(g.RAMA_DEL_ENTORNO) === '{"name":"main","type":"branch"}');
check('11) «impedir que apruebe quien lo lanza» queda apagado a propósito: el dueño lanza y aprueba',
  g.ENTORNO_GET_WEE.prevent_self_review === false);

/* ── 4. Los comandos y la verificación ───────────────────────────────────── */
const cmds = g.comandos().filter((c) => c.startsWith('gh '));
check('12) los comandos solo envían los JSON de ops/github (existentes) y nunca borran nada',
  cmds.length === 7 && cmds.every((c) => /^gh api --method (PATCH|PUT|POST) repos\/geovetlf\/wee-app[^ ]* --input ops\/github\/[a-z-]+\.json$/.test(c)
    && fs.existsSync(path.join(RAIZ, c.split('--input ')[1]))), cmds.filter((c) => !/--input/.test(c)).join(' | '));
const fuente = leer('ops/github/proteccion.mjs');
check('13) `verificar` solo hace GET: un único spawnSync de `gh api <ruta>`, sin --method ni campos',
  (fuente.match(/spawnSync\(/g) || []).length === 1 && /spawnSync\('gh', \['api', ruta\]/.test(fuente)
  && Object.values(g.LECTURAS).every((r) => r.startsWith('repos/geovetlf/wee-app')) && !/execSync|execFile/.test(fuente));

/* Un GitHub conforme, construido desde los JSON; y el de hoy (2026-10-01, leído en solo lectura). */
const conforme = () => JSON.parse(JSON.stringify({
  ruleset: JSON.parse(JSON.stringify(g.RULESET)),
  repositorio: { ...g.AJUSTES },
  acciones: { ...g.ACCIONES },
  accionesPermitidas: { ...g.ACCIONES_PERMITIDAS },
  permisos: { ...g.PERMISOS_DE_WORKFLOWS },
  entorno: { name: 'get-wee', deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
    protection_rules: [{ type: 'required_reviewers', prevent_self_review: false, reviewers: [{ type: 'User', reviewer: { id: 325097307, login: 'geovetlf' } }] }] },
  ramasDelEntorno: { total_count: 1, branch_policies: [{ name: 'main', type: 'branch' }] },
}));
const hoy = { ruleset: null, repositorio: { allow_merge_commit: true, allow_squash_merge: true, allow_rebase_merge: true },
  acciones: { enabled: true, allowed_actions: 'all', sha_pinning_required: false }, accionesPermitidas: null,
  permisos: { default_workflow_permissions: 'read', can_approve_pull_request_reviews: false }, entorno: null, ramasDelEntorno: null };
const con = (f) => { const x = conforme(); f(x); return g.comparar(x); };
check('14) lo propuesto, aplicado, sale CONFORME', g.comparar(conforme()).length === 0, g.comparar(conforme()).join(' | '));
check('15) el GitHub de hoy (sin protección) da las seis diferencias que se leyeron el 2026-10-01', g.comparar(hoy).length === 6, g.comparar(hoy).join(' | '));
check('16) y detecta cada desvío: squash en el PR, una excepción, un check de otra app, la rama sin exigir al día, o desplegar desde otra rama',
  con((x) => { x.ruleset.rules.find((r) => r.type === 'pull_request').parameters.allowed_merge_methods = ['merge', 'squash']; }).length === 1
  && con((x) => { x.ruleset.bypass_actors = [{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'always' }]; }).length === 1
  && con((x) => { x.ruleset.rules.find((r) => r.type === 'required_status_checks').parameters.required_status_checks[0].integration_id = 999; }).length === 1
  && con((x) => { x.ruleset.rules.find((r) => r.type === 'required_status_checks').parameters.strict_required_status_checks_policy = false; }).length === 1
  && con((x) => { x.ramasDelEntorno.branch_policies.push({ name: '*', type: 'branch' }); }).length === 1
  && con((x) => { x.accionesPermitidas.patterns_allowed.push('alguien/accion@*'); }).length === 1);

const pkg = JSON.parse(leer('functions/package.json'));
check('17) esta suite está en la cadena de `npm test`', /proteccion-github\.test\.mjs/.test(pkg.scripts.test));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
