#!/usr/bin/env node
/*
 * EL BUILD GUARDIAN COMO PUERTA, SIN CONFUNDIR UN FALLO CON UN VERDE — `ops/harness/guardian-estricto.mjs`.
 *
 * Lo usan la CI (`ops/harness/guardian-ci.mjs`) y los hooks de Claude Code (`.claude/hooks/guardian-stop.mjs`). No es
 * otro guardián: lanza `ops/harness/guardian.mjs --estricto --json` como subproceso, con tiempo máximo, y solo da PASA
 * si TODO cuadra: salida 0, JSON del contrato `wee-guardian@1` con `veredicto.resultado === 'PASA'`, y el veredicto
 * recalculado aquí (`veredictoEstricto`, la misma función pura) dice lo mismo. BLOQUEA exige salida 1 con el mismo
 * cuadre. Cualquier otra cosa es FALLO —tiempo agotado, señal, Node que no arranca, salida 2 (entrada) o 3 (fallo
 * interno), salida 1 sin JSON (un módulo que no carga también sale 1), JSON ilegible o que contradice su código— y un
 * FALLO no es verde para nadie.
 *
 * Solo lee: no escribe, no hace push ni despliega. Lo fija functions/test/guardian-bloqueante.test.mjs.
 */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { veredictoEstricto, CONTRATO } from './guardian.mjs';

export const GUARDIAN = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guardian.mjs');
export const TIEMPO_POR_DEFECTO_MS = 10 * 60 * 1000;
export const RESULTADOS = Object.freeze(['PASA', 'BLOQUEA', 'FALLO']);

const fallo = (motivo, extra = {}) => ({ resultado: 'FALLO', motivo, bloquean: [], ...extra });
const corto = (t, n = 400) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n);
const mismaLista = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Pura: lo que significa la ejecución de un subproceso del Guardian estricto. `x` tiene la forma de `spawnSync`
 * (`status`, `signal`, `error`, `stdout`, `stderr`).
 */
export const interpretar = (x, { bloquear = null } = {}) => {
  if (!x || typeof x !== 'object') return fallo('no hay resultado del subproceso');
  if (x.error) {
    const porTiempo = x.error.code === 'ETIMEDOUT';
    return fallo(porTiempo ? 'el Guardian agotó su tiempo máximo: no se sabe qué diría' : `el Guardian no se pudo ejecutar (${x.error.code || x.error.message})`, { codigo: x.status ?? null });
  }
  if (x.signal) return fallo(`el Guardian terminó por la señal ${x.signal}`, { codigo: null });
  if (x.status === 2) return fallo(`el Guardian rechazó la entrada (salida 2): ${corto(x.stderr)}`, { codigo: 2 });
  if (x.status === 3) return fallo(`el Guardian falló por dentro (salida 3): ${corto(x.stderr)}`, { codigo: 3 });
  if (x.status !== 0 && x.status !== 1) return fallo(`salida inesperada del Guardian: ${x.status}`, { codigo: x.status ?? null });
  let informe;
  try { informe = JSON.parse(String(x.stdout || '')); } catch {
    return fallo(`salida ${x.status} sin un JSON legible (¿un módulo que no carga?): ${corto(x.stderr || x.stdout)}`, { codigo: x.status });
  }
  if (!informe || informe.contrato !== CONTRATO) return fallo(`el JSON no es del contrato ${CONTRATO}`, { codigo: x.status });
  if (!informe.veredicto || !RESULTADOS.slice(0, 2).includes(informe.veredicto.resultado)) return fallo('el JSON no trae veredicto estricto', { codigo: x.status });
  let v;
  try { v = veredictoEstricto(informe, { bloquear }); } catch (e) {
    return fallo(`el informe no es coherente: ${e.message}`, { codigo: x.status });
  }
  const codigoEsperado = v.resultado === 'PASA' ? 0 : 1;
  if (v.resultado !== informe.veredicto.resultado || x.status !== codigoEsperado || !mismaLista(v.bloquean, informe.veredicto.bloquean)) {
    return fallo(`incoherente: el código es ${x.status}, el JSON dice ${informe.veredicto.resultado} y recalculado da ${v.resultado}`, { codigo: x.status });
  }
  return { resultado: v.resultado, codigo: x.status, bloquean: v.bloquean, informe, motivo: v.resultado === 'PASA' ? 'ningún CRITICAL que bloquee' : `CRITICAL que bloquean: ${v.bloquean.join(', ')}` };
};

/**
 * Lanza el Guardian estricto y lo interpreta. `modo` 'cambio' (con `base`) o 'antes' (con `archivos`).
 * `guion` y `node` existen para las pruebas (un Guardian falso que tarda, miente o se rompe).
 */
export const ejecutarGuardianEstricto = ({
  modo, raiz, base, archivos, bloquear = null, tiempoMs = TIEMPO_POR_DEFECTO_MS, guion = GUARDIAN, node = process.execPath, env = process.env,
} = {}) => {
  const args = [guion, modo];
  if (modo === 'cambio') {
    if (!base || typeof base !== 'string') return fallo('falta la base del diff');
    args.push('--base', base);
  } else if (modo === 'antes') {
    if (!Array.isArray(archivos) || !archivos.length) return fallo('faltan los archivos');
    if (archivos.some((a) => typeof a !== 'string' || !a || a.includes(','))) return fallo('una ruta vacía o con coma no se puede pasar al Guardian sin cambiarla');
    args.push('--archivos', archivos.join(','));
  } else return fallo(`modo desconocido: ${modo}`);
  if (raiz) args.push('--raiz', raiz);
  args.push('--json', '--estricto');
  if (bloquear !== null) args.push('--bloquear', bloquear.join(','));
  const x = spawnSync(node, args, { encoding: 'utf8', timeout: tiempoMs, killSignal: 'SIGKILL', maxBuffer: 64 * 1024 * 1024, windowsHide: true, env });
  return interpretar(x, { bloquear });
};
