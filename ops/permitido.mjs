#!/usr/bin/env node
/*
 * ¿SE PUEDE DESPLEGAR ESTO SIN PISAR LO QUE YA FUNCIONA EN PRODUCCIÓN?
 *
 * Regla (misión del Harness, FASE 4): no se sobrescribe producción con un
 * commit que no CONTIENE el código que hoy corre. Para cada función a
 * desplegar se mira en `ops/produccion.json` qué commit está vivo; el commit
 * que se quiere desplegar tiene que descender de él. Si no, desplegarlo
 * borraría cambios que están funcionando (hoy: generateVideo, productions,
 * shots y barridoDeLiquidacion viven en commits que main no tiene).
 *
 * Una función que no está en el mapa es nueva: no pisa nada, pero se avisa. Si además está declarada en
 * `ops/despliegue/grupos.json` → `primeros_despliegues` (hoy solo el espejo de la fase 2 de users), su primer
 * despliegue es EXPLÍCITO: va solo, como su grupo declarado, sin otra función ni otro objetivo, y el aviso dice
 * qué paso de su secuencia es y cuál viene después. Para las funciones vivas no cambia nada.
 * Los avisos del mapa (p. ej. spendCredits) se repiten siempre.
 *
 * Lo mismo vale para las reglas, los índices, Storage y los dos Hosting: el
 * commit tiene que contener el que está vivo. Mientras el `main` de GitHub
 * (bfc622d) no tenga las reglas de moderación (c3515b3), desplegar reglas desde
 * él las borraría de producción.
 *
 *   node ops/permitido.mjs --commit <sha|ref> --funciones generateVideo,spendCredits
 *   node ops/permitido.mjs --commit <sha|ref> --otros firestore:rules,hosting:wee-app
 *
 * Sale con 0 si se puede, 1 si no, 2 si falta algo para decidirlo. Solo lee
 * git y el mapa: no llama a Google Cloud ni a nada externo.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { motivosContraElCierreDeUsers } from './despliegue/cierre-users.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Qué entrada de `ops/produccion.json` → `otros` corresponde a cada objetivo que no es una función. */
export const DESPLEGABLE_DE = {
  'firestore:rules': 'firestore',
  'firestore:indexes': 'firestore',
  storage: 'storage-rules',
  'hosting:get-wee': 'hosting:get-wee',
  'hosting:wee-app': 'hosting:wee-app',
};

/**
 * Decisión pura. `contiene(vivo, candidato)` dice si el commit candidato contiene al vivo
 * (git: `merge-base --is-ancestor vivo candidato`); devuelve null si no se puede saber.
 * `reglas` es el texto de `firestore.rules` EN EL CANDIDATO: con `firestore:rules` es obligatorio, porque unas
 * reglas que cierran `users` solo se publican con las condiciones de `cierreDeUsers` (despliegue/cierre-users.mjs).
 * `grupos` (opcional) es `ops/despliegue/grupos.json`: con él se aplica la regla de los primeros despliegues declarados.
 */
export const decidir = ({ manifiesto, funciones = [], otros = [], contiene, candidato, reglas, grupos }) => {
  /* Sin mapa (o con algo que no es un mapa) no se decide nada: bloqueado. */
  if (!manifiesto || typeof manifiesto !== 'object' || Array.isArray(manifiesto)) {
    return { permitido: false, bloqueos: ['ops/produccion.json no es un mapa legible: no se sabe qué hay vivo.'], avisos: [], desconocido: [] };
  }
  const porNombre = new Map((manifiesto.funciones || []).map((f) => [f.funcion, f]));
  const bloqueos = [];
  const avisos = [];
  const desconocido = [];
  for (const nombre of funciones) {
    const viva = porNombre.get(nombre);
    if (!viva) {
      avisos.push(`${nombre}: no está en producción; se desplegaría por primera vez.`);
      const g = ((grupos && grupos.primeros_despliegues) || []).find((x) => (x.funciones || []).includes(nombre));
      if (g) {
        const exacto = otros.length === 0 && funciones.length === g.funciones.length && g.funciones.every((f) => funciones.includes(f));
        if (!exacto) bloqueos.push(`${nombre}: su primer despliegue está declarado (ops/despliegue/grupos.json → ${g.id}) y va SOLO, como ese grupo (${g.funciones.map((f) => `functions:${f}`).join(',')}), sin otras funciones ni otros objetivos.`);
        else avisos.push(`${nombre}: primer despliegue declarado ${g.id} (${g.fase}, paso ${g.paso}). Después: ${(g.secuencia || [])[g.paso] || 'ver la secuencia en grupos.json'}`);
      }
      continue;
    }
    if (viva.aviso) avisos.push(`${nombre}: ${viva.aviso}`);
    const si = contiene(viva.commit, candidato);
    if (si === null) desconocido.push(`${nombre}: no se puede comprobar si ${candidato} contiene ${viva.commit.slice(0, 7)} (¿falta historia o el commit?).`);
    else if (!si) {
      bloqueos.push(`${nombre}: en producción corre ${viva.commit.slice(0, 7)} (${viva.tag || 'sin tag'}) y ${candidato} no lo contiene. `
        + `Desplegarlo borraría lo que funciona: integra antes ${viva.ramas ? `la rama ${viva.ramas.join(' o ')}` : 'ese commit'}.`);
    }
    /* Arreglos de seguridad aún no desplegados: cualquier despliegue de la función tiene que llevarlos. */
    for (const r of viva.requiere || []) {
      const lleva = contiene(r.commit, candidato);
      if (lleva === null) desconocido.push(`${nombre}: no se puede comprobar si ${candidato} lleva ${r.commit.slice(0, 7)} (${r.motivo}).`);
      else if (!lleva) bloqueos.push(`${nombre}: ${candidato} no lleva ${r.commit.slice(0, 7)} (${r.motivo}); desplegarlo desharía ese arreglo.`);
    }
  }
  for (const objetivo of otros) {
    const vivo = (manifiesto.otros || []).find((o) => o.desplegable === DESPLEGABLE_DE[objetivo]);
    /*
     * El cierre de users (fase 2) se comprueba ANTES de nada y sin depender de que el mapa traiga la entrada viva:
     * sin reglas legibles → desconocido; reglas que no se saben interpretar o que cierran users sin las tres
     * condiciones demostradas → bloqueo. Nada de esto se rebaja a un aviso.
     */
    if (objetivo === 'firestore:rules') {
      if (typeof reglas !== 'string') desconocido.push('firestore:rules: no se pudieron leer las reglas del candidato; no se sabe si cierran users (fase 2).');
      else for (const m of motivosContraElCierreDeUsers({ reglas, manifiesto, contiene })) bloqueos.push(`firestore:rules: ${m}.`);
      /* Sin la entrada viva de firestore no se sabe qué reglas pisaría: se bloquea, no se avisa. */
      if (!vivo) { bloqueos.push('firestore:rules: ops/produccion.json no trae la entrada de firestore; no se sabe qué reglas hay vivas.'); continue; }
    }
    if (!vivo) { avisos.push(`${objetivo}: no está en el mapa; no se puede saber qué hay vivo.`); continue; }
    const si = contiene(vivo.commit, candidato);
    if (si === null) desconocido.push(`${objetivo}: no se puede comprobar si ${candidato} contiene ${vivo.commit.slice(0, 7)}.`);
    else if (!si) {
      bloqueos.push(`${objetivo}: en producción está ${vivo.commit.slice(0, 7)} (${vivo.tag}) y ${candidato} no lo contiene: publicaría una versión anterior.`);
    }
    if (DESPLEGABLE_DE[objetivo] === 'firestore') {
      avisos.push(`${objetivo}: revisa lo que se publicaría además de lo vivo: git diff ${vivo.commit.slice(0, 7)} ${candidato} -- firestore.rules firestore.indexes.json`);
    }
  }
  return { permitido: bloqueos.length === 0 && desconocido.length === 0, bloqueos, avisos, desconocido };
};

const contieneSegunGit = (cwd) => (vivo, candidato) => {
  try {
    execFileSync('git', ['cat-file', '-e', `${vivo}^{commit}`], { cwd, stdio: 'ignore' });
  } catch { return null; }
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', vivo, candidato], { cwd, stdio: 'ignore' });
    return true;
  } catch (e) {
    return e.status === 1 ? false : null;
  }
};

const principal = () => {
  const args = process.argv.slice(2);
  const valor = (op) => { const i = args.indexOf(op); return i >= 0 ? args[i + 1] : undefined; };
  const candidato = valor('--commit');
  const funciones = String(valor('--funciones') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const otros = String(valor('--otros') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const raros = otros.filter((o) => !DESPLEGABLE_DE[o]);
  if (!candidato || (!funciones.length && !otros.length) || raros.length) {
    console.error(`uso: node ops/permitido.mjs --commit <sha|ref> [--funciones a,b] [--otros ${Object.keys(DESPLEGABLE_DE).join(',')}]${raros.length ? ` (desconocido: ${raros.join(', ')})` : ''}`);
    process.exit(2);
  }
  const manifiesto = JSON.parse(fs.readFileSync(path.join(RAIZ, 'ops/produccion.json'), 'utf8'));
  /* Las reglas DEL CANDIDATO (no las del disco): son las que se publicarían. */
  let reglas;
  if (otros.includes('firestore:rules')) {
    try { reglas = execFileSync('git', ['show', `${candidato}:firestore.rules`], { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { reglas = undefined; }
  }
  /* Los primeros despliegues declarados (ops/despliegue/grupos.json): sin ese archivo no se decide una función nueva. */
  let grupos;
  try { grupos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'ops/despliegue/grupos.json'), 'utf8')); } catch { grupos = undefined; }
  if (!grupos && funciones.some((f) => !(manifiesto.funciones || []).some((x) => x.funcion === f))) {
    console.error('? no se pudo leer ops/despliegue/grupos.json: no se sabe si una función nueva tiene su primer despliegue declarado');
    process.exit(2);
  }
  const r = decidir({ manifiesto, funciones, otros, contiene: contieneSegunGit(RAIZ), candidato, reglas, grupos });
  for (const b of r.bloqueos) console.log(`✘ ${b}`);
  for (const d of r.desconocido) console.log(`? ${d}`);
  for (const a of r.avisos) console.log(`! ${a}`);
  console.log(r.permitido ? `✔ ${candidato} contiene lo que está vivo de: ${[...funciones, ...otros].join(', ')}` : '✘ no se despliega');
  process.exit(r.permitido ? 0 : r.bloqueos.length ? 1 : 2);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) principal();
