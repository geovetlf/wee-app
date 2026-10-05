/*
 * EL MAPA DE PRODUCCIÓN Y LA REGLA DE NO PISARLA — `ops/produccion.json` y `ops/permitido.mjs`.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * La auditoría H0 (2026-09-30) identificó, byte a byte, qué commit corre en
 * cada una de las 34 funciones de get-wee, y cuatro de ellas (generateVideo,
 * productions, shots, barridoDeLiquidacion) corren código que main NO tiene.
 * Desplegarlas desde main borraría lo que funciona. La misión del Harness lo
 * prohíbe (FASE 4) hasta integrar ese código de forma segura.
 *
 * Esta suite fija:
 *  · que el mapa está completo y bien formado (34 funciones con revisión,
 *    commit, tag, zip#generación, md5 y build; reglas, índices y hosting);
 *  · que la regla de `ops/permitido.mjs` se EJECUTA como debe: no se despliega
 *    un commit que no contiene el código vivo, ni uno que no lleva un arreglo
 *    de seguridad pendiente (spendCredits, H0 #24);
 *  · y, si este clon tiene los tags y la historia, que cada tag apunta al
 *    commit del mapa (en una copia sin tags, eso se salta y se dice).
 */
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const mapa = JSON.parse(leer('ops/produccion.json'));
const { decidir, DESPLEGABLE_DE } = await import(pathToFileURL(path.resolve(RAIZ, 'ops/permitido.mjs')).href);
const fns = mapa.funciones || [];
const por = Object.fromEntries(fns.map((f) => [f.funcion, f]));

/* ── A. El mapa ─────────────────────────────────────────────────────────── */
check('1) es de get-wee, us-central1', mapa.proyecto === 'get-wee' && mapa.region === 'us-central1');
check('2) tiene las 34 funciones vivas, sin repetir', fns.length === 34 && new Set(fns.map((f) => f.funcion)).size === 34, String(fns.length));
const malFormadas = fns.filter((f) => !/^[0-9a-f]{40}$/.test(f.commit)
  || !(/^prod\/functions\//.test(f.tag || '') || (!f.tag && String(f.sinTag || '').length > 40))
  || !f.revision || !f.revision.startsWith(f.funcion.toLowerCase() + '-')
  || !f.fuente || !f.fuente.zip || !/^\d+$/.test(f.fuente.generacion || '') || !/^[A-Za-z0-9+/]{22}==$/.test(f.fuente.md5 || '')
  || !/^[0-9a-f-]{36}$/.test(f.build || ''));
check('3) cada función trae revisión, commit completo, tag (o por qué no lo tiene), zip#generación, md5 y build', malFormadas.length === 0,
  malFormadas.map((f) => f.funcion).join(', '));
const fuera = fns.filter((f) => !f.enMain).map((f) => f.funcion).sort();
check('4) las que corren código fuera de main son exactamente las cuatro de H0, con la rama donde vive',
  fuera.join(',') === 'barridoDeLiquidacion,generateVideo,productions,shots' && fns.filter((f) => !f.enMain).every((f) => (f.ramas || []).length > 0),
  fuera.join(', '));
/* Hasta el 2026-10-05, spendCredits exigía aquí el arreglo de #24 (b878068). Desde su despliegue gobernado ya lo lleva,
 * así que la regla se prueba con el mapa de juguete (8 y 9) y aquí solo se exige que cada arreglo pendiente esté bien dicho. */
check('5) cada arreglo pendiente (`requiere`) del mapa dice qué commit falta y por qué',
  fns.every((f) => (f.requiere || []).every((r) => /^[0-9a-f]{40}$/.test(r.commit) && String(r.motivo || '').length > 10)));
const otros = Object.fromEntries((mapa.otros || []).map((o) => [o.desplegable, o]));
check('6) también están las reglas e índices de Firestore (exactos), las de Storage, los dos hostings y Vercel',
  otros.firestore && otros.firestore.exacto === true && otros['storage-rules'] && otros['hosting:get-wee'] && otros['hosting:wee-app']
  && otros['hosting:wee-app'].exacto === false && /aprox/.test(otros['hosting:wee-app'].tag) && Object.keys(otros).some((k) => /^vercel/.test(k)));

/* ── B. La regla, ejecutada con una historia de juguete ─────────────────── */
const VIVO = 'a'.repeat(40);
const ARREGLO = 'b'.repeat(40);
const juguete = {
  funciones: [
    { funcion: 'x', commit: VIVO, tag: 'prod/functions/x/t', ramas: ['rama-x'] },
    { funcion: 'y', commit: VIVO, tag: 'prod/functions/y/t', requiere: [{ commit: ARREGLO, motivo: 'arreglo de seguridad' }] },
  ],
};
const historia = (contenidos) => (c, candidato) => (contenidos[candidato] || []).includes(c);
const H = historia({ viejo: [], conVivo: [VIVO], conTodo: [VIVO, ARREGLO] });
const r1 = decidir({ manifiesto: juguete, funciones: ['x'], contiene: H, candidato: 'viejo' });
check('7) un commit que no contiene el código vivo NO se despliega, y dice qué integrar', !r1.permitido && /rama-x/.test(r1.bloqueos[0] || ''));
const r2 = decidir({ manifiesto: juguete, funciones: ['y'], contiene: H, candidato: 'conVivo' });
check('8) ni uno que contiene lo vivo pero no lleva un arreglo de seguridad pendiente', !r2.permitido && /arreglo de seguridad/.test(r2.bloqueos[0] || ''));
const r3 = decidir({ manifiesto: juguete, funciones: ['x', 'y'], contiene: H, candidato: 'conTodo' });
check('9) con lo vivo y el arreglo, sí', r3.permitido && r3.bloqueos.length === 0);
const r4 = decidir({ manifiesto: juguete, funciones: ['nueva'], contiene: H, candidato: 'viejo' });
check('10) una función que no está en producción no pisa nada, pero se avisa', r4.permitido && /primera vez/.test(r4.avisos[0] || ''));
const r5 = decidir({ manifiesto: juguete, funciones: ['x'], contiene: () => null, candidato: 'conTodo' });
check('11) si no se puede saber (falta historia), NO se despliega', !r5.permitido && r5.desconocido.length === 1);
const conOtros = { ...juguete, otros: [{ desplegable: 'firestore', commit: VIVO, tag: 'prod/firestore/t' }, { desplegable: 'hosting:wee-app', commit: VIVO, tag: 'prod/hosting/wee-app/t' }] };
const o1 = decidir({ manifiesto: conOtros, otros: ['firestore:rules', 'hosting:wee-app'], contiene: H, candidato: 'viejo' });
const o2 = decidir({ manifiesto: conOtros, otros: ['firestore:indexes'], contiene: H, candidato: 'conVivo' });
check('11b) las reglas, los índices y el Hosting siguen la misma regla: un commit que no contiene lo vivo publicaría una versión anterior',
  !o1.permitido && o1.bloqueos.length === 2 && o1.bloqueos.every((b) => /versión anterior/.test(b)) && o2.permitido
  && o2.avisos.some((a) => /git diff a{7} conVivo -- firestore\.rules firestore\.indexes\.json/.test(a)));
const { OBJETIVOS_FIJOS } = await import(pathToFileURL(path.resolve(RAIZ, 'ops/despliegue/plan.mjs')).href);
check('11c) cada objetivo fijo del workflow tiene su entrada en el mapa', [...OBJETIVOS_FIJOS].every((o) => (mapa.otros || []).some((x) => x.desplegable === DESPLEGABLE_DE[o])),
  [...OBJETIVOS_FIJOS].filter((o) => !(mapa.otros || []).some((x) => x.desplegable === DESPLEGABLE_DE[o])).join(', ') || 'todos');
const verificar = leer('ops/despliegue/cli.mjs');
check('11d) el workflow pasa a la regla las funciones Y lo demás (reglas, índices, Storage, Hosting)',
  /'--otros', objetivo\.otros\.join\(','\)/.test(verificar) && /'--funciones', objetivo\.funciones\.join\(','\)/.test(verificar));

/* ── C. Con la historia de verdad, si este clon la tiene ────────────────── */
const git = (...a) => { try { return execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const tags = [...new Set([...fns.filter((f) => f.tag).map((f) => f.tag), ...(mapa.otros || []).map((o) => o.tag)])];
const presentes = tags.filter((t) => git('rev-parse', '--verify', '--quiet', `refs/tags/${t}`));
if (presentes.length === 0) {
  console.log('· este clon no tiene los tags prod/* (CI o copia sin tags): se salta la comprobación contra git');
} else {
  const commitDe = Object.fromEntries([...fns.map((f) => [f.tag, f.commit]), ...(mapa.otros || []).map((o) => [o.tag, o.commit])]);
  const descuadrados = presentes.filter((t) => git('rev-parse', `${t}^{commit}`) !== commitDe[t]);
  check('12) cada tag prod/* apunta al commit del mapa', presentes.length === tags.length && descuadrados.length === 0,
    `${presentes.length}/${tags.length} presentes${descuadrados.length ? '; descuadrados: ' + descuadrados.join(', ') : ''}`);
  const anotados = presentes.filter((t) => git('cat-file', '-t', `refs/tags/${t}`) === 'tag');
  check('13) y son tags anotados (llevan la evidencia en el mensaje)', anotados.length === presentes.length);
  const gv = por.generateVideo;
  if (git('cat-file', '-e', `${gv.commit}^{commit}`) !== null) {
    const correr = (commit, f) => spawnSync(process.execPath, [path.resolve(RAIZ, 'ops/permitido.mjs'), '--commit', commit, '--funciones', f], { cwd: RAIZ, encoding: 'utf8' });
    check('14) de verdad: generateVideo se puede desplegar desde su propio commit', correr(gv.commit, 'generateVideo').status === 0);
    const base = fns.find((f) => f.funcion === 'getCreditCost').commit;
    const r = correr(base, 'generateVideo');
    check('15) …y no desde un commit anterior que no lo contiene (sale 1 y lo explica)', r.status === 1 && /no lo contiene/.test(r.stdout), r.stdout.trim().split('\n')[0]);
    const reglas = (commit) => spawnSync(process.execPath, [path.resolve(RAIZ, 'ops/permitido.mjs'), '--commit', commit, '--otros', 'firestore:rules'], { cwd: RAIZ, encoding: 'utf8' });
    const vivoReglas = otros.firestore.commit;
    const anterior = git('rev-parse', `${vivoReglas}^`);
    check('15b) de verdad: las reglas no se despliegan desde un commit anterior a las vivas (las de moderación)',
      anterior !== null && reglas(anterior).status === 1 && reglas(vivoReglas).status === 0);
  }
}

/* ── D. La documentación apunta al mapa y a la regla ────────────────────── */
const despliegue = leer('docs/DEPLOYMENT.md');
check('16) docs/DEPLOYMENT.md explica el mapa y la regla', /ops\/produccion\.json/.test(despliegue) && /ops\/permitido\.mjs/.test(despliegue));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
