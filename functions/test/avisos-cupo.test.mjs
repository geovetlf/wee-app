/*
 * UN AVISO NO SE CONVIERTE EN UN TELÉFONO INUNDADO — revisión post-auditoría 2026-10-01,
 * hallazgo trust/push-a-cualquiera/firestore.rules#notifications.create (la parte del servidor).
 *
 *   node test/avisos-cupo.test.mjs        (usa el compilado)
 *
 * Crear un aviso en `notifications` es del cliente y cada uno disparaba un push real. Las reglas acotan su forma; el
 * NÚMERO lo acota el servidor: un cupo por CUENTA que avisa (`cupoDeAvisos`, social/avisos.ts) guardado en
 * `pushLimits/{cuenta}`, una colección que ningún cliente puede tocar. El nombre que se enseña ya salía del perfil de
 * quien firma (Fase 11.x-4A, seguridad-11x4a #27-28); aquí se vigila el cupo y que el destino se lea una sola vez.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const lib = (p) => require(path.resolve(here, '../lib', p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { cupoDeAvisos, CUPO_DE_AVISOS } = lib('social/avisos.js');
const HORA = 60 * 60 * 1000;
const t0 = 1_800_000_000_000;

console.log('\n── A · El cupo (puro) ──');
{
  const primero = cupoDeAvisos(undefined, t0);
  check('1) el primer aviso de una cuenta suena y abre su ventana', primero.permitido && primero.estado.inicio === t0 && primero.estado.usados === 1);
  let estado = undefined;
  let sonaron = 0;
  for (let i = 0; i < CUPO_DE_AVISOS.maximo + 25; i++) {
    const r = cupoDeAvisos(estado, t0 + i * 1000);
    if (r.permitido) sonaron++;
    estado = r.estado;
  }
  check(`2) dentro de una hora suenan como mucho ${CUPO_DE_AVISOS.maximo}; el resto no`, sonaron === CUPO_DE_AVISOS.maximo, String(sonaron));
  check('3) pasada la ventana, vuelve a sonar desde cero', cupoDeAvisos(estado, t0 + HORA + 1).permitido && cupoDeAvisos(estado, t0 + HORA + 1).estado.usados === 1);
  check('4) un estado guardado roto o del futuro no regala avisos infinitos: se cuenta desde ahora',
    cupoDeAvisos({ inicio: 'x', usados: -5 }, t0).estado.usados === 1 && cupoDeAvisos({ inicio: t0 + HORA, usados: 999 }, t0).estado.usados === 1);
  check('5) el cupo es razonable para una persona real (no se queda en 1, ni es infinito)', CUPO_DE_AVISOS.maximo >= 20 && CUPO_DE_AVISOS.maximo <= 200 && CUPO_DE_AVISOS.ventanaMs === HORA);
}

console.log('\n── B · El disparador lo usa, y lee el destino una vez ──');
{
  const indice = leer('functions/src/index.ts');
  const sinComentarios = indice.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const disparador = sinComentarios.slice(sinComentarios.indexOf('export const sendPushNotification'), sinComentarios.indexOf('export const sendMessagePushNotification'));
  check('6) el aviso gasta cupo de la CUENTA que avisa antes de mandar el push',
    /const cuentaQueAvisa = await cuentaDeLaIdentidad\(senderId\);/.test(disparador)
    && disparador.indexOf('gastarCupoDeAvisos(cuentaQueAvisa)') > 0 && disparador.indexOf('gastarCupoDeAvisos(cuentaQueAvisa)') < disparador.indexOf('sendExpoPush('));
  check('7) el cupo vive en `pushLimits/{cuenta}`, dentro de una transacción', /db\.collection\('pushLimits'\)\.doc\(cuenta\)/.test(sinComentarios) && /db\.runTransaction\(async \(tx\) => \{\s*const \{ permitido, estado \} = cupoDeAvisos\(/.test(sinComentarios));
  check('8) si el cupo no se puede comprobar, no suena (falla cerrado)', /console\.error\('Avisos: no se pudo comprobar el cupo', cuenta, error\);\s*return false;/.test(indice));
  check('9) `pushTokens/{cuenta}` se lee UNA vez por destinatario (token y locale juntos)',
    (sinComentarios.match(/collection\('pushTokens'\)\.doc\(cuenta\)\.get\(\)/g) || []).length === 1, String((sinComentarios.match(/collection\('pushTokens'\)\.doc\(cuenta\)\.get\(\)/g) || []).length));
  check('10) ningún cliente puede leer ni escribir `pushLimits` (sin regla = cerrada)', !/match \/pushLimits/.test(leer('firestore.rules')) && !/document=\*\*/.test(leer('firestore.rules')));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
