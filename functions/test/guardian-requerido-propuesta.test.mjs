/**
 * EL GUARDIAN DE LA BASE COMO CHECK OBLIGATORIO — PREPARADO, NO APLICADO (`ops/github/propuesta-guardian-requerido.json`).
 *
 * `guardian-base.yml` es el único control que un PR no puede cambiar para su propia ejecución, pero hoy solo AVISA: para que
 * BLOQUEE, su check «Guardian de la base (independiente)» tiene que ser un check requerido del ruleset «main protegida».
 * Cambiar ese ruleset es decisión del dueño, y hacerlo antes de tiempo es peligroso: un check requerido que nunca llega
 * deja TODOS los PRs en «Expected — waiting for status» para siempre (GitHub lee un workflow `pull_request_target` de la rama
 * BASE: mientras `guardian-base.yml` no esté en main, el check no existe). Esta suite fija lo que se deja PREPARADO:
 *
 *   A  la propuesta es el ruleset de hoy MÁS un check —solo uno—, con el nombre exacto del trabajo del workflow y emitido por
 *      GitHub Actions (integration_id 15368: un estado puesto por otra app no cuenta).
 *   B  no está aplicada: `ruleset-main.json` sigue exigiendo los cuatro de la CI y `proteccion.mjs` no la usa. Y, aplicada,
 *      `verificar` seguiría diciendo «conforme» (no se rompe la herramienta que vigila la protección).
 *   C  el check LLEGA SIEMPRE: el workflow no tiene filtros de rama o ruta ni un `if:` que lo salte. Un filtro dejaría
 *      PRs esperando para siempre; un `if:` que lo salte contaría como verde sin haber mirado nada.
 *   D  el procedimiento queda escrito (docs/LANZAMIENTO.md §8): orden, comandos exactos de aplicar y de volver atrás, y cuándo NO.
 *   E  el detector, con textos saboteados.
 *
 * No toca GitHub ni lee nada de él: todo son archivos del repositorio.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
let fallo = 0;
const check = (nombre, ok, evidencia = '') => { if (!ok) fallo++; process.stdout.write(`${ok ? '✔' : '✘'} ${nombre}${evidencia ? ` · ${evidencia}` : ''}\n`); };
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const importar = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);
const sinComentarios = (s) => s.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');

const g = await importar('ops/github/proteccion.mjs');
const { trabajos } = await importar('scripts/ci-local.mjs');

const ACTUAL = JSON.parse(leer('ops/github/ruleset-main.json'));
const PROPUESTA_TEXTO = leer('ops/github/propuesta-guardian-requerido.json');
const PROPUESTA = JSON.parse(PROPUESTA_TEXTO);
const checksDe = (rs) => rs.rules.find((r) => r.type === 'required_status_checks').parameters.required_status_checks;
const WF = leer('.github/workflows/guardian-base.yml');
const [trabajo] = trabajos(WF);

/* ── Las reglas, puras ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Un ruleset sin el check dado: lo demás tiene que ser idéntico al de hoy. */
const sinElCheck = (rs, contexto) => {
  const copia = JSON.parse(JSON.stringify(rs));
  const params = copia.rules.find((r) => r.type === 'required_status_checks').parameters;
  params.required_status_checks = params.required_status_checks.filter((c) => c.context !== contexto);
  return copia;
};

/** Por qué el check de un workflow podría NO llegar (o llegar sin haber mirado nada). Vacío = llega siempre. */
const razonesParaNoLlegar = (workflow) => {
  const s = sinComentarios(workflow);
  const razones = [];
  const disparo = (s.match(/^on:\s*\n([\s\S]*?)^(?=\S)/m) || [, ''])[1];
  if (/^\s+(branches|branches-ignore|paths|paths-ignore|tags|tags-ignore):/m.test(disparo)) razones.push('un filtro de rama, etiqueta o ruta en el disparador: los PRs que no encajen se quedan esperando el check para siempre');
  if (!/pull_request_target:/.test(disparo)) razones.push('no se dispara con pull_request_target');
  const tipos = ((disparo.match(/types:\s*\[([^\]]*)\]/) || [, ''])[1]).split(',').map((x) => x.trim());
  for (const t of ['opened', 'synchronize', 'reopened']) if (!tipos.includes(t)) razones.push(`no corre al ${t} el PR: el check quedaría viejo o ausente`);
  if (/^\s{4}if:/m.test(s)) razones.push('el trabajo tiene `if:`: si se salta, GitHub lo da por bueno sin que el Guardian mire nada');
  if (/continue-on-error:\s*true/.test(s)) razones.push('continue-on-error: true: un fallo del Guardian no se vería');
  return razones;
};

/** Pura: ¿la propuesta es exactamente `actual` + el check del Guardian, y emitido por GitHub Actions? Devuelve las diferencias. */
const diferenciasDeLaPropuesta = (actual, propuesta, contexto, emisor) => {
  const d = [];
  const nuevos = checksDe(propuesta).filter((c) => !checksDe(actual).some((a) => a.context === c.context));
  if (nuevos.length !== 1) d.push(`añade ${nuevos.length} checks y debe añadir exactamente 1`);
  else {
    if (nuevos[0].context !== contexto) d.push(`el check añadido se llama «${nuevos[0].context}», no «${contexto}»`);
    if (nuevos[0].integration_id !== emisor) d.push(`el check no exige que lo emita GitHub Actions (${emisor}): lo pondría cualquier app`);
  }
  const quitados = checksDe(actual).filter((a) => !checksDe(propuesta).some((c) => c.context === a.context));
  if (quitados.length) d.push(`quita checks de hoy: ${quitados.map((c) => c.context).join(', ')}`);
  if (JSON.stringify(sinElCheck(propuesta, contexto)) !== JSON.stringify(actual)) d.push('cambia algo más que ese check (reglas, excepciones, método de fusión, rama al día…)');
  return d;
};

/* ── A · la propuesta ───────────────────────────────────────────────────────────────────────────────────────────────────────── */
const CONTEXTO = 'Guardian de la base (independiente)';
check('A1 el nombre del check es el del trabajo de guardian-base.yml, letra por letra', trabajo?.nombre === CONTEXTO, trabajo?.nombre);
const dif = diferenciasDeLaPropuesta(ACTUAL, PROPUESTA, CONTEXTO, g.ACCIONES_DE_GITHUB);
check('A2 la propuesta es el ruleset de hoy MÁS ese check —solo uno—, emitido por GitHub Actions, sin cambiar nada más', dif.length === 0, dif.join(' | '));
const contextos = checksDe(PROPUESTA).map((c) => c.context);
check('A3 los cuatro de la CI siguen, en su orden, y el Guardian va el último', JSON.stringify(contextos.slice(0, 4)) === JSON.stringify(checksDe(ACTUAL).map((c) => c.context)) && contextos[4] === CONTEXTO && contextos.length === 5);
check('A4 el archivo es JSON puro del mismo esquema que ruleset-main.json (sin comentarios ni campos nuevos): se envía tal cual con `gh api --input`',
  !/\/\/|\/\*/.test(PROPUESTA_TEXTO) && JSON.stringify(Object.keys(PROPUESTA)) === JSON.stringify(Object.keys(ACTUAL)));

/* ── B · no aplicada, y la herramienta de vigilancia sigue valiendo ─────────────────────────────────────────────────────────── */
check('B1 `ruleset-main.json` —lo que proteccion.mjs imprime y verifica— sigue exigiendo SOLO los cuatro de la CI', checksDe(ACTUAL).length === 4 && !checksDe(ACTUAL).some((c) => c.context === CONTEXTO));
const fuenteProteccion = leer('ops/github/proteccion.mjs');
check('B2 proteccion.mjs no usa la propuesta: sus comandos no la aplican', !/propuesta-guardian/.test(fuenteProteccion) && !g.comandos().join('\n').includes('propuesta-guardian'));
const conforme = (ruleset) => JSON.parse(JSON.stringify({
  ruleset, repositorio: { ...g.AJUSTES }, acciones: { ...g.ACCIONES }, accionesPermitidas: { ...g.ACCIONES_PERMITIDAS }, permisos: { ...g.PERMISOS_DE_WORKFLOWS },
  entorno: { name: 'get-wee', deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
    protection_rules: [{ type: 'required_reviewers', prevent_self_review: false, reviewers: [{ type: 'User', reviewer: { id: 325097307, login: 'geovetlf' } }] }] },
  ramasDelEntorno: { total_count: 1, branch_policies: [{ name: 'main', type: 'branch' }] },
}));
check('B3 aplicada la propuesta, `proteccion.mjs verificar` seguiría diciendo CONFORME (admite un check de más, no uno de menos)',
  g.comparar(conforme(PROPUESTA)).length === 0 && g.comparar(conforme(ACTUAL)).length === 0, g.comparar(conforme(PROPUESTA)).join(' | '));
const sinGuardian = JSON.parse(JSON.stringify(PROPUESTA));
checksDe(sinGuardian).pop();
check('B4 …y el camino de vuelta (aplicar de nuevo `ruleset-main.json`) también sale conforme', g.comparar(conforme(sinGuardian)).length === 0);

/* ── C · el check llega siempre ─────────────────────────────────────────────────────────────────────────────────────────────── */
const razones = razonesParaNoLlegar(WF);
check('C1 guardian-base.yml reporta en TODOS los PRs: sin filtros de rama o ruta, con opened/synchronize/reopened, sin `if:` ni continue-on-error', razones.length === 0, razones.join(' | '));
check('C2 el trabajo tiene tiempo máximo: un Guardian colgado no deja el check «pendiente» indefinidamente', /timeout-minutes:\s*\d+/.test(sinComentarios(WF)));

/* ── D · el procedimiento está escrito ──────────────────────────────────────────────────────────────────────────────────────── */
const doc = leer('docs/LANZAMIENTO.md');
const seccion = (doc.match(/^## 8\. [\s\S]*?(?=^## \d+\. |(?![\s\S]))/m) || [''])[0];
check('D1 docs/LANZAMIENTO.md §8 existe y dice que NO está aplicada', /^## 8\. .*Guardian/m.test(doc) && /NO está aplicad/i.test(seccion));
check('D2 el orden: primero #29 en main y el check visible en un PR; solo entonces se aplica', /#29/.test(seccion) && /guardian-base\.yml/.test(seccion) && /antes de aplicar|solo entonces|después de/i.test(seccion));
check('D3 los comandos exactos: leer el id, aplicar la propuesta y volver a `ruleset-main.json`',
  /gh api repos\/geovetlf\/wee-app\/rulesets --jq/.test(seccion) && /--method PUT repos\/geovetlf\/wee-app\/rulesets\/<id> --input ops\/github\/propuesta-guardian-requerido\.json/.test(seccion)
  && /--method PUT repos\/geovetlf\/wee-app\/rulesets\/<id> --input ops\/github\/ruleset-main\.json/.test(seccion));
check('D4 y cuándo NO aplicar: workflow ausente de main, nombre distinto, filtros, o un PR en cola esperando', /cuándo NO/i.test(seccion) && /Expected/.test(seccion));

/* ── E · el detector, con textos saboteados ─────────────────────────────────────────────────────────────────────────────────── */
const clon = () => JSON.parse(PROPUESTA_TEXTO);
const conMas = clon();
checksDe(conMas).push({ context: 'Otro check', integration_id: 15368 });
check('E1 una propuesta que añade DOS checks se detecta', diferenciasDeLaPropuesta(ACTUAL, conMas, CONTEXTO, 15368).some((x) => /añade 2/.test(x)));
const otroNombre = clon();
checksDe(otroNombre)[4].context = 'Guardian';
check('E2 un nombre que no es el del trabajo (el check nunca llegaría y bloquearía todo) se detecta', diferenciasDeLaPropuesta(ACTUAL, otroNombre, CONTEXTO, 15368).some((x) => /no «Guardian de la base/.test(x)));
const sinEmisor = clon();
delete checksDe(sinEmisor)[4].integration_id;
check('E3 un check sin emisor fijado (lo podría poner cualquier app) se detecta', diferenciasDeLaPropuesta(ACTUAL, sinEmisor, CONTEXTO, 15368).some((x) => /GitHub Actions/.test(x)));
const quitaUno = clon();
checksDe(quitaUno).splice(0, 1);
check('E4 una propuesta que QUITA un check de la CI de hoy se detecta', diferenciasDeLaPropuesta(ACTUAL, quitaUno, CONTEXTO, 15368).some((x) => /quita checks de hoy/.test(x)));
const cambiaOtraCosa = clon();
cambiaOtraCosa.rules.find((r) => r.type === 'pull_request').parameters.allowed_merge_methods = ['merge', 'squash'];
check('E5 una propuesta que cambia otra regla de paso (admitir squash) se detecta', diferenciasDeLaPropuesta(ACTUAL, cambiaOtraCosa, CONTEXTO, 15368).some((x) => /cambia algo más/.test(x)));
const conExcepcion = clon();
conExcepcion.bypass_actors = [{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'always' }];
check('E6 una propuesta que añade una excepción (bypass) se detecta', diferenciasDeLaPropuesta(ACTUAL, conExcepcion, CONTEXTO, 15368).some((x) => /cambia algo más/.test(x)));
check('E7 un workflow con filtro de rutas se detecta (los PRs que no toquen esas rutas esperarían el check para siempre)',
  razonesParaNoLlegar(WF.replace('    types: [opened', "    paths: ['ops/**']\n    types: [opened")).some((x) => /filtro/.test(x)));
check('E8 un workflow con filtro de ramas se detecta', razonesParaNoLlegar(WF.replace('    types: [opened', "    branches: [main]\n    types: [opened")).some((x) => /filtro/.test(x)));
check('E9 un trabajo con `if:` se detecta (saltarse el Guardian contaría como verde)',
  razonesParaNoLlegar(WF.replace('    runs-on: ubuntu-latest', "    if: github.actor != 'dependabot[bot]'\n    runs-on: ubuntu-latest")).some((x) => /if:/.test(x)));
check('E10 un workflow que no corre al sincronizar (el check quedaría viejo tras un push) se detecta',
  razonesParaNoLlegar(WF.replace('synchronize, ', '')).some((x) => /synchronize/.test(x)));
check('E11 continue-on-error: true se detecta', razonesParaNoLlegar(WF.replace('    runs-on: ubuntu-latest', '    continue-on-error: true\n    runs-on: ubuntu-latest')).some((x) => /continue-on-error/.test(x)));
check('E12 el workflow de hoy no dispara ninguna de esas razones (los E7–E11 vienen de un texto que sí es limpio)', razonesParaNoLlegar(WF).length === 0);

const pkg = JSON.parse(leer('functions/package.json'));
check('esta suite está en la cadena de `npm test`', /guardian-requerido-propuesta\.test\.mjs/.test(pkg.scripts.test));

process.stdout.write(fallo ? `\n✘ ${fallo} comprobación(es) fallaron\n` : '\n✔ El Guardian como check obligatorio está PREPARADO y NO aplicado: una propuesta de un solo check, con el nombre y el emisor exactos, y el procedimiento escrito\n');
process.exit(fallo ? 1 : 0);
