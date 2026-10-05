/*
 * EL VERIFICADOR DE LA IDENTIDAD DE DESPLIEGUE — `ops/iam/wif-verificar.mjs`.
 *
 * Lo corre el dueño contra Google Cloud cuando haya creado la identidad; aquí se
 * prueba sin red: (1) que SOLO lee —ninguna orden escribe—, y (2) que distingue
 * una identidad conforme de cada forma de que no lo sea: condición con prefijo,
 * mapeo cambiado, un rol de más o prohibido, otro repositorio que puede hacerse
 * pasar por la cuenta, permisos sobre la cuenta de ejecución, o una clave
 * descargable. El caso conforme se construye desde wif.mjs, así que si wif.mjs
 * cambia, esta prueba sigue describiendo lo mismo.
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

const wif = await importar('ops/iam/wif.mjs');
const v = await importar('ops/iam/wif-verificar.mjs');
const fuente = fs.readFileSync(path.join(RAIZ, 'ops/iam/wif-verificar.mjs'), 'utf8');

/* ── 1. Solo lee ─────────────────────────────────────────────────────────── */
const ordenes = Object.values(v.LECTURAS);
const ESCRIBEN = /\b(create|delete|add-iam-policy-binding|remove-iam-policy-binding|set-iam-policy|update|undelete|enable|disable|keys create|sign-blob|sign-jwt|print-access-token)\b/;
check('1) cada orden es una LECTURA: describe, get-iam-policy o list, y ninguna escribe',
  ordenes.length === 6 && ordenes.every((o) => o.some((p) => v.VERBOS_DE_LECTURA.includes(p)) && !ESCRIBEN.test(o.join(' '))),
  ordenes.map((o) => o.slice(0, 4).join(' ')).join(' · '));
check('2) y solo se ejecuta gcloud con esas órdenes: un único spawnSync, sin exec ni comandos armados como texto',
  (fuente.match(/spawnSync\(/g) || []).length === 1 && /spawnSync\('gcloud', args/.test(fuente) && !/execSync|exec\(|execFile/.test(fuente));
check('3) no lee ningún secreto ni pide tokens', !/secrets versions access|access-token|identity-token|secretmanager/.test(ordenes.flat().join(' ')));

/* ── 2. Distingue lo conforme ────────────────────────────────────────────── */
const sa = `serviceAccount:${wif.CUENTA}`;
const mapeo = Object.fromEntries(wif.MAPEO.split(',').map((p) => [p.slice(0, p.indexOf('=')), p.slice(p.indexOf('=') + 1)]));
const conforme = () => ({
  proveedor: { name: 'projects/x/locations/global/workloadIdentityPools/github/providers/wee-app', state: 'ACTIVE',
    oidc: { issuerUri: 'https://token.actions.githubusercontent.com' }, attributeCondition: wif.CONDICION, attributeMapping: { ...mapeo } },
  proyecto: { bindings: [
    ...wif.ROLES.map(([role]) => ({ role, members: [sa, 'user:otra@persona.com'] })),
    { role: 'roles/owner', members: ['user:geovetlf@gmail.com'] },
  ] },
  cuenta: { bindings: [{ role: 'roles/iam.workloadIdentityUser', members: [v.MIEMBRO_DEL_REPOSITORIO] }] },
  ejecucion: { bindings: [{ role: 'roles/iam.serviceAccountUser', members: [sa] }] },
  appEngine: { bindings: [{ role: 'roles/iam.serviceAccountUser', members: [sa] }] },
  claves: [],
});
const con = (f) => { const x = conforme(); f(x); return v.comparar(x); };

check('4) una identidad creada con los comandos de wif.mjs sale CONFORME', v.comparar(conforme()).length === 0, v.comparar(conforme()).join(' | '));
check('5) sin identidad (aún no creada) no es conforme, y dice qué falta',
  v.comparar({ proveedor: null, proyecto: null, cuenta: null, ejecucion: null, appEngine: null, claves: null }).length === 6);
check('6) una condición con PREFIJO (startsWith) no es conforme',
  con((x) => { x.proveedor.attributeCondition = wif.CONDICION.replace("assertion.workflow_ref == '", "assertion.workflow_ref.startsWith('").replace("main' && assertion.ref", "main') && assertion.ref"); })
    .some((d) => /condición/.test(d)));
check('7) quitar el entorno o la rama de la condición tampoco',
  con((x) => { x.proveedor.attributeCondition = wif.CONDICION.split(' && ').filter((p) => !/environment/.test(p)).join(' && '); }).length === 1
  && con((x) => { x.proveedor.attributeCondition = wif.CONDICION.split(' && ').filter((p) => !/assertion\.ref ==/.test(p)).join(' && '); }).length === 1);
check('8) un mapeo cambiado (el sujeto ya no dice quién) o con un atributo de más no es conforme',
  con((x) => { x.proveedor.attributeMapping['google.subject'] = 'assertion.sub'; }).some((d) => /google\.subject/.test(d))
  && con((x) => { x.proveedor.attributeMapping['attribute.extra'] = 'assertion.sub'; }).some((d) => /attribute\.extra/.test(d)));
check('9) un emisor que no es GitHub, o el proveedor deshabilitado, no es conforme',
  con((x) => { x.proveedor.oidc.issuerUri = 'https://otro.example.com'; }).length === 1
  && con((x) => { x.proveedor.state = 'DELETED'; }).length === 1);
check('10) un rol de MÁS, un rol PROHIBIDO o uno que falta, no es conforme',
  con((x) => { x.proyecto.bindings.push({ role: 'roles/storage.admin', members: [sa] }); }).some((d) => /de más: roles\/storage\.admin/.test(d))
  && con((x) => { x.proyecto.bindings.push({ role: 'roles/editor', members: [sa] }); }).some((d) => /PROHIBIDOS: roles\/editor/.test(d))
  && con((x) => { x.proyecto.bindings = x.proyecto.bindings.filter((b) => b.role !== 'roles/run.developer'); }).some((d) => /faltan roles: roles\/run\.developer/.test(d)));
check('11) que OTRO repositorio, o todo el pool, pueda hacerse pasar por la cuenta no es conforme',
  con((x) => { x.cuenta.bindings[0].members.push('principalSet://iam.googleapis.com/projects/1/locations/global/workloadIdentityPools/github/*'); }).length === 1
  && con((x) => { x.cuenta.bindings[0].members = [v.MIEMBRO_DEL_REPOSITORIO.replace(wif.REPOSITORIO_ID, '1')]; }).length === 1
  && con((x) => { x.cuenta.bindings.push({ role: 'roles/iam.serviceAccountTokenCreator', members: ['user:alguien@x.com'] }); }).length === 1);
check('12) sobre la cuenta de ejecución, solo «actuar como»: un rol más (crear tokens) no es conforme',
  con((x) => { x.ejecucion.bindings.push({ role: 'roles/iam.serviceAccountTokenCreator', members: [sa] }); }).length === 1
  && con((x) => { x.ejecucion.bindings = []; }).length === 1);
check('12b) sobre la cuenta de App Engine, lo mismo (firebase-tools lo comprueba antes de desplegar), y esa cuenta sin roles en el proyecto',
  con((x) => { x.appEngine.bindings = []; }).some((d) => /App Engine/.test(d))
  && con((x) => { x.appEngine.bindings.push({ role: 'roles/iam.serviceAccountTokenCreator', members: [sa] }); }).length === 1
  && con((x) => { x.proyecto.bindings.push({ role: 'roles/editor', members: [`serviceAccount:${wif.CUENTA_DE_APP_ENGINE}`] }); }).some((d) => /escalada/.test(d)));
check('13) una clave descargable en la cuenta de despliegue no es conforme (con WIF no hace falta ninguna)',
  con((x) => { x.claves = [{ name: 'k1', keyType: 'USER_MANAGED' }]; }).some((d) => /clave/.test(d)));
check('14) un rol con condición no es conforme (los de wif.mjs van sin ella, --condition=None)',
  con((x) => { x.proyecto.bindings.find((b) => b.role === 'roles/run.developer').condition = { expression: 'true', title: 't' }; }).some((d) => /condición/.test(d)));

const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'functions/package.json'), 'utf8'));
check('15) esta suite está en la cadena de `npm test`', /wif-verificar\.test\.mjs/.test(pkg.scripts.test));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
