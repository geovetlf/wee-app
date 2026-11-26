/*
 * EL PASE DE AUTONOMÍA (paso 2B-1): las decisiones del dueño del 2026-11-22,
 * ejecutadas con un reloj de mentira.
 *
 *  A · la puerta empieza cerrada y la configuración se valida;
 *  B · 24 h desde que se activa, cobro por bloque al empezar y sin repetir;
 *  C · 3 días o una semana programados ANTES, sin renovación automática;
 *  D · si Weë falla, esas horas no cuentan y el reloj se reanuda;
 *  E · el dueño apaga: los bloques no empezados no se cobran;
 *  F · tope de acciones por bloque, que se reinicia en el bloque siguiente;
 *  G · sin saldo, el reloj se para; encargos a Weë AI con el catálogo de siempre.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const P = require(path.resolve(here, '../lib/personajes/pase.js'));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const H = P.MS_POR_HORA;
const abierta = { ...P.CONFIG_DEL_PASE_POR_DEFECTO, abierta: true, bloquesPermitidos: [1, 3, 7] };
const T0 = 1_000_000_000;
const nuevo = (bloques, config = abierta) => { const r = P.programar(null, 'jay', bloques, config, T0); if (!r.pase) throw new Error(r.error); return r.pase; };

console.log('\n── A · Puerta y configuración ──');
{
  const d = P.CONFIG_DEL_PASE_POR_DEFECTO;
  check('por defecto: puerta CERRADA, 30 Credits por 24 h, 30 acciones, 1/3/7 días', d.abierta === false && d.creditosPorBloque === 30 && d.horasPorBloque === 24 && d.accionesPorBloque === 30 && JSON.stringify(d.bloquesPermitidos) === '[1,3,7]');
  check('con la puerta cerrada nadie programa', P.programar(null, 'jay', 1, d, T0).error === 'puertaCerrada');
  check('una duración no permitida se rechaza', P.programar(null, 'jay', 2, abierta, T0).error === 'duracionNoPermitida');
  const m = P.mezclarConfigDelPase(d, { abierta: true, creditosPorBloque: 40, bloquesPermitidos: [7, 1, 1, 3, 0, 99, 'x'] });
  check('Firestore cambia precio y duraciones, validando', m.abierta && m.creditosPorBloque === 40 && JSON.stringify(m.bloquesPermitidos) === '[1,3,7]');
  const malo = P.mezclarConfigDelPase(d, { creditosPorBloque: -5, horasPorBloque: 0, accionesPorBloque: 1.5, bloquesPermitidos: [] });
  check('lo inválido se ignora', malo.creditosPorBloque === 30 && malo.horasPorBloque === 24 && malo.accionesPorBloque === 30 && malo.bloquesPermitidos.length === 3);
  check('la configuración por defecto está congelada', Object.isFrozen(d));
}

console.log('\n── B · 24 horas desde que se activa ──');
{
  let p = nuevo(1);
  check('recién programado hay que cobrar el bloque 0 antes de actuar', P.bloqueAPagar(p, T0) === 0 && P.puedeActuar(p, T0).motivo === 'bloqueSinPagar');
  check('el id de cobro es estable (un reintento no cobra dos veces)', P.idDeCobro(p, 0) === P.idDeCobro({ ...p }, 0) && P.idDeCobro(p, 0) !== P.idDeCobro(p, 1));
  p = P.registrarCobro(p, 0, T0);
  check('cobrado: puede actuar y no hay nada más que cobrar', P.puedeActuar(p, T0 + H).ok && P.bloqueAPagar(p, T0 + 23 * H) === null);
  check('registrar el mismo cobro dos veces no suma dos bloques', P.registrarCobro(p, 0, T0).bloquesCobrados === 1);
  check('a las 24 h exactas se termina', P.alDia(p, T0 + 24 * H).estado === 'terminada' && !P.puedeActuar(p, T0 + 24 * H).ok);
  check('terminado, no se vuelve a cobrar nada', P.bloqueAPagar(p, T0 + 30 * H) === null);
  check('y otro pase no se puede programar encima de uno vivo', P.programar(p, 'jay', 1, abierta, T0 + H).error === 'yaActivo');
  check('pero sí cuando el anterior terminó', !!P.programar(P.alDia(p, T0 + 25 * H), 'jay', 1, abierta, T0 + 25 * H).pase);
}

console.log('\n── C · Varios días programados antes ──');
{
  let p = P.registrarCobro(nuevo(3), 0, T0);
  check('dentro del primer día no se cobra el segundo', P.bloqueAPagar(p, T0 + 23 * H) === null);
  check('al empezar el día 2 se cobra el bloque 1', P.bloqueAPagar(p, T0 + 24 * H) === 1 && P.puedeActuar(p, T0 + 24 * H).motivo === 'bloqueSinPagar');
  p = P.registrarCobro(p, 1, T0 + 24 * H);
  p = P.registrarCobro(p, 2, T0 + 48 * H);
  check('se cobran exactamente los 3 bloques programados', p.bloquesCobrados === 3 && P.bloqueAPagar(p, T0 + 70 * H) === null);
  check('a las 72 h termina: sin renovación automática', P.alDia(p, T0 + 72 * H).estado === 'terminada' && P.bloqueAPagar(p, T0 + 80 * H) === null);
  const s = P.registrarCobro(nuevo(7), 0, T0);
  check('una semana son 7 bloques de 24 h', P.tiempoRestante(s, T0) === 7 * 24 * H);
}

console.log('\n── D · Si Weë falla, esas horas no cuentan ──');
{
  let p = P.registrarCobro(nuevo(1), 0, T0);
  p = P.pausarPorWee(p, T0 + 10 * H, 'caidaDelProveedor');
  check('pausado por falla: no puede actuar y el reloj se para', !P.puedeActuar(p, T0 + 12 * H).ok && P.tiempoUsado(p, T0 + 15 * H) === 10 * H);
  p = P.reanudar(p, T0 + 15 * H);
  check('al reanudar, el tiempo sigue desde donde quedó', P.tiempoUsado(p, T0 + 16 * H) === 11 * H && P.puedeActuar(p, T0 + 16 * H).ok);
  check('y el día termina 5 h más tarde (las 5 h de falla no contaron)', P.alDia(p, T0 + 28 * H).estado === 'activa' && P.alDia(p, T0 + 29 * H).estado === 'terminada');
  check('una falla no cobra un bloque nuevo', P.bloqueAPagar(p, T0 + 28 * H) === null);
  check('reanudar algo que no estaba pausado por falla no hace nada', P.reanudar(P.registrarCobro(nuevo(1), 0, T0), T0 + H).tramoDesde === T0);
}

console.log('\n── E · El dueño apaga ──');
{
  let p = P.registrarCobro(nuevo(7), 0, T0);
  p = P.apagar(p, T0 + 5 * H);
  check('apagado: se acaba y no actúa más', p.estado === 'apagada' && !P.puedeActuar(p, T0 + 6 * H).ok);
  check('los 6 días que no empezaron NO se cobran nunca', P.bloqueAPagar(p, T0 + 30 * H) === null && p.bloquesCobrados === 1);
}

console.log('\n── F · Tope de acciones por bloque ──');
{
  let p = P.registrarCobro(nuevo(3, { ...abierta, accionesPorBloque: 3 }), 0, T0);
  for (let i = 0; i < 3; i++) p = P.registrarAccion(p, T0 + i * H);
  check('al llegar al tope se pausa hasta el bloque siguiente', p.estado === 'pausadaPorTope' && P.puedeActuar(p, T0 + 5 * H).motivo === 'topeDeAcciones');
  check('la pausa por tope NO para el reloj (no es culpa de Weë)', P.tiempoUsado(p, T0 + 10 * H) === 10 * H);
  check('en el bloque siguiente se paga y el contador vuelve a cero', P.bloqueAPagar(p, T0 + 24 * H) === 1);
  p = P.registrarCobro(p, 1, T0 + 24 * H);
  const q = P.puedeActuar(p, T0 + 24 * H);
  check('y puede actuar otra vez', q.ok && q.pase.accionesEnBloque === 0 && q.pase.estado === 'activa');
  const cambia = P.registrarCobro(nuevo(1), 0, T0);
  check('el precio y el tope quedan fijados al programar (un cambio de configuración no altera lo ya pagado)', cambia.creditosPorBloque === 30 && cambia.accionesPorBloque === 30);
}

console.log('\n── G · Sin saldo, y encargos a Weë AI ──');
{
  let p = P.registrarCobro(nuevo(3), 0, T0);
  p = P.sinSaldo(p, T0 + 24 * H);
  check('sin saldo para el bloque 2: se para y no consume tiempo sin pagar', p.estado === 'pausadaSinSaldo' && P.tiempoUsado(p, T0 + 40 * H) === 24 * H);
  check('sigue pidiendo cobrar ese bloque', P.bloqueAPagar(p, T0 + 40 * H) === 1);
  p = P.registrarCobro(p, 1, T0 + 40 * H);
  check('al cobrarlo vuelve a correr desde donde quedó', p.estado === 'activa' && P.tiempoUsado(p, T0 + 41 * H) === 25 * H);
  check('los encargos usan los servicios del catálogo de Credits de siempre', P.SERVICIO_DE_ENCARGO.investigar === 'ai_search' && P.SERVICIO_DE_ENCARGO.generarImagen === 'ai_image_lite' && P.SERVICIO_DE_ENCARGO.generarVideo === 'ai_video');
  const cat = leer('functions/src/credits/creditCosts.ts');
  check('y esos servicios existen en el catálogo', Object.values(P.SERVICIO_DE_ENCARGO).every((s) => new RegExp(`\\b${s}:`).test(cat)));
  const src = sinComentarios(leer('functions/src/personajes/pase.ts'));
  check('el pase es lógica pura: ni Firestore, ni IA, ni dinero', !/firebase|fetch|creditEngine|spendCredits|engine\./.test(src));
  check('esta suite está en la cadena de `npm test`', /personaje-pase\.test\.mjs/.test(leer('functions/package.json')));
}

console.log('\nPase de autonomía: 24 h, bloques, fallas, apagado, topes y saldo');
if (failures > 0) { console.error(`\n${failures} comprobación(es) fallida(s)`); process.exit(1); }
