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
 * Una función que no está en el mapa es nueva: no pisa nada, pero se avisa.
 * Los avisos del mapa (p. ej. spendCredits) se repiten siempre.
 *
 *   node ops/permitido.mjs --commit <sha|ref> --funciones generateVideo,spendCredits
 *
 * Sale con 0 si se puede, 1 si no, 2 si falta algo para decidirlo. Solo lee
 * git y el mapa: no llama a Google Cloud ni a nada externo.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Decisión pura. `contiene(vivo, candidato)` dice si el commit candidato contiene al vivo
 * (git: `merge-base --is-ancestor vivo candidato`); devuelve null si no se puede saber.
 */
export const decidir = ({ manifiesto, funciones, contiene, candidato }) => {
  const porNombre = new Map((manifiesto.funciones || []).map((f) => [f.funcion, f]));
  const bloqueos = [];
  const avisos = [];
  const desconocido = [];
  for (const nombre of funciones) {
    const viva = porNombre.get(nombre);
    if (!viva) { avisos.push(`${nombre}: no está en producción; se desplegaría por primera vez.`); continue; }
    if (viva.aviso) avisos.push(`${nombre}: ${viva.aviso}`);
    const si = contiene(viva.commit, candidato);
    if (si === null) desconocido.push(`${nombre}: no se puede comprobar si ${candidato} contiene ${viva.commit.slice(0, 7)} (¿falta historia o el commit?).`);
    else if (!si) {
      bloqueos.push(`${nombre}: en producción corre ${viva.commit.slice(0, 7)} (${viva.tag}) y ${candidato} no lo contiene. `
        + `Desplegarlo borraría lo que funciona: integra antes ${viva.ramas ? `la rama ${viva.ramas.join(' o ')}` : 'ese commit'}.`);
    }
    /* Arreglos de seguridad aún no desplegados: cualquier despliegue de la función tiene que llevarlos. */
    for (const r of viva.requiere || []) {
      const lleva = contiene(r.commit, candidato);
      if (lleva === null) desconocido.push(`${nombre}: no se puede comprobar si ${candidato} lleva ${r.commit.slice(0, 7)} (${r.motivo}).`);
      else if (!lleva) bloqueos.push(`${nombre}: ${candidato} no lleva ${r.commit.slice(0, 7)} (${r.motivo}); desplegarlo desharía ese arreglo.`);
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
  if (!candidato || !funciones.length) {
    console.error('uso: node ops/permitido.mjs --commit <sha|ref> --funciones a,b,c');
    process.exit(2);
  }
  const manifiesto = JSON.parse(fs.readFileSync(path.join(RAIZ, 'ops/produccion.json'), 'utf8'));
  const r = decidir({ manifiesto, funciones, contiene: contieneSegunGit(RAIZ), candidato });
  for (const b of r.bloqueos) console.log(`✘ ${b}`);
  for (const d of r.desconocido) console.log(`? ${d}`);
  for (const a of r.avisos) console.log(`! ${a}`);
  console.log(r.permitido ? `✔ ${candidato} contiene el código vivo de: ${funciones.join(', ')}` : '✘ no se despliega');
  process.exit(r.permitido ? 0 : r.bloqueos.length ? 1 : 2);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) principal();
