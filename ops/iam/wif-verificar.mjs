#!/usr/bin/env node
/*
 * ¿LO QUE HAY EN GOOGLE CLOUD ES LO QUE DICE ops/iam/wif.mjs? — Weë Agent Harness, FASE 6.
 *
 *   node ops/iam/wif-verificar.mjs
 *
 * Lo corre el DUEÑO después de ejecutar los comandos de `wif.mjs` (y cuando quiera
 * volver a mirar). SOLO LEE: cada orden es un `describe`, un `get-iam-policy` o un
 * `list` (lo fija functions/test/wif-verificar.test.mjs). No cambia nada, no lee
 * ningún secreto y no crea credenciales.
 *
 * Comprueba que la identidad de despliegue es exactamente la mínima:
 *  · el proveedor existe, está activo, confía solo en GitHub y su condición y su
 *    mapeo son LOS de wif.mjs (igualdad exacta, nada de prefijos);
 *  · la cuenta de despliegue tiene en el proyecto los roles de ROLES, ni uno más,
 *    ninguno de NUNCA y sin condiciones raras;
 *  · solo este repositorio (por id) puede hacerse pasar por ella;
 *  · puede «actuar como» la cuenta de ejecución (para desplegar), y nada más;
 *  · no tiene ninguna clave descargable.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONDICION, CUENTA, CUENTA_DE_EJECUCION, MAPEO, NUMERO, NUNCA, PROYECTO, REPOSITORIO_ID, ROLES } from './wif.mjs';

export const EMISOR = 'https://token.actions.githubusercontent.com';
export const MIEMBRO_DEL_REPOSITORIO = `principalSet://iam.googleapis.com/projects/${NUMERO}/locations/global/workloadIdentityPools/github/attribute.repository_id/${REPOSITORIO_ID}`;

/** Las lecturas, y solo lecturas. */
export const LECTURAS = Object.freeze({
  proveedor: ['iam', 'workload-identity-pools', 'providers', 'describe', 'wee-app', `--project=${PROYECTO}`, '--location=global', '--workload-identity-pool=github', '--format=json'],
  proyecto: ['projects', 'get-iam-policy', PROYECTO, '--format=json'],
  cuenta: ['iam', 'service-accounts', 'get-iam-policy', CUENTA, `--project=${PROYECTO}`, '--format=json'],
  ejecucion: ['iam', 'service-accounts', 'get-iam-policy', CUENTA_DE_EJECUCION, `--project=${PROYECTO}`, '--format=json'],
  claves: ['iam', 'service-accounts', 'keys', 'list', `--iam-account=${CUENTA}`, '--managed-by=user', `--project=${PROYECTO}`, '--format=json'],
});
export const VERBOS_DE_LECTURA = Object.freeze(['describe', 'get-iam-policy', 'list']);

const mapeoEsperado = () => Object.fromEntries(MAPEO.split(',').map((par) => {
  const i = par.indexOf('=');
  return [par.slice(0, i), par.slice(i + 1)];
}));
const sinEspacios = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const rolesDe = (politica, miembro) => (politica?.bindings || []).filter((b) => (b.members || []).includes(miembro));

/**
 * Pura: las diferencias entre lo que hay y lo que dice wif.mjs (vacía = conforme).
 * `null` en una lectura = no existe (o no se pudo leer).
 */
export const comparar = ({ proveedor, proyecto, cuenta, ejecucion, claves }) => {
  const d = [];
  const sa = `serviceAccount:${CUENTA}`;

  if (!proveedor) d.push('el proveedor github/wee-app no existe (o no se pudo leer)');
  else {
    if (proveedor.disabled || (proveedor.state && proveedor.state !== 'ACTIVE')) d.push(`el proveedor no está activo (${proveedor.state || 'disabled'})`);
    if (proveedor.oidc?.issuerUri !== EMISOR) d.push(`el proveedor confía en ${proveedor.oidc?.issuerUri || '¿?'}, no en ${EMISOR}`);
    if (sinEspacios(proveedor.attributeCondition) !== CONDICION) d.push('la condición del proveedor no es la de wif.mjs');
    const esperado = mapeoEsperado();
    const vivo = proveedor.attributeMapping || {};
    const claves_ = [...new Set([...Object.keys(esperado), ...Object.keys(vivo)])].sort();
    const distintos = claves_.filter((k) => sinEspacios(vivo[k]) !== sinEspacios(esperado[k]));
    if (distintos.length) d.push(`el mapeo de atributos no es el de wif.mjs: ${distintos.join(', ')}`);
  }

  if (!proyecto) d.push('no se pudo leer la política IAM del proyecto');
  else {
    const vinculos = rolesDe(proyecto, sa);
    const tiene = vinculos.map((b) => b.role).sort();
    const debe = ROLES.map(([r]) => r).sort();
    const sobran = tiene.filter((r) => !debe.includes(r));
    const faltan = debe.filter((r) => !tiene.includes(r));
    const prohibidos = tiene.filter((r) => NUNCA.includes(r));
    if (prohibidos.length) d.push(`la cuenta de despliegue tiene roles PROHIBIDOS: ${prohibidos.join(', ')}`);
    if (sobran.length) d.push(`la cuenta de despliegue tiene roles de más: ${sobran.join(', ')}`);
    if (faltan.length) d.push(`a la cuenta de despliegue le faltan roles: ${faltan.join(', ')}`);
    const condicionados = vinculos.filter((b) => b.condition).map((b) => b.role);
    if (condicionados.length) d.push(`roles con condición (wif.mjs los da sin ella): ${condicionados.join(', ')}`);
  }

  if (!cuenta) d.push('no se pudo leer la política de la cuenta de despliegue (¿existe?)');
  else {
    const vinculos = cuenta.bindings || [];
    const usuarios = vinculos.filter((b) => b.role === 'roles/iam.workloadIdentityUser').flatMap((b) => b.members || []);
    if (JSON.stringify(usuarios) !== JSON.stringify([MIEMBRO_DEL_REPOSITORIO])) {
      d.push(`quién puede hacerse pasar por la cuenta no es SOLO este repositorio: ${usuarios.join(', ') || 'nadie'}`);
    }
    const otros = vinculos.filter((b) => b.role !== 'roles/iam.workloadIdentityUser').map((b) => b.role);
    if (otros.length) d.push(`la cuenta de despliegue concede otros roles sobre sí misma: ${otros.join(', ')}`);
  }

  if (!ejecucion) d.push('no se pudo leer la política de la cuenta de ejecución');
  else {
    const roles = rolesDe(ejecucion, sa).map((b) => b.role).sort();
    if (JSON.stringify(roles) !== JSON.stringify(['roles/iam.serviceAccountUser'])) {
      d.push(`sobre la cuenta de ejecución, la de despliegue debe tener solo roles/iam.serviceAccountUser; tiene: ${roles.join(', ') || 'nada'}`);
    }
  }

  if (!Array.isArray(claves)) d.push('no se pudieron listar las claves de la cuenta de despliegue');
  else if (claves.length) d.push(`la cuenta de despliegue tiene ${claves.length} clave(s) descargable(s): con WIF no debe tener ninguna`);

  return d;
};

const leerDeGoogle = (args) => {
  const r = spawnSync('gcloud', args, { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log('# Weë · ¿la identidad de despliegue es la de ops/iam/wif.mjs? (solo lectura)\n');
  const leido = Object.fromEntries(Object.entries(LECTURAS).map(([k, args]) => [k, leerDeGoogle(args)]));
  const d = comparar(leido);
  if (!d.length) { console.log('✔ Conforme: la identidad de despliegue es exactamente la de wif.mjs.'); process.exit(0); }
  for (const x of d) console.log(`✘ ${x}`);
  process.exit(1);
}
