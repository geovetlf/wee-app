/*
 * EL SERVIDOR DEL PASE DE AUTONOMÍA (paso 2B-2), con dependencias de mentira:
 * ni Firestore, ni Credit Engine, ni IA.
 *
 *  A · la ficha del servidor es copia EXACTA de la de la app;
 *  B · programar: dueño, ficha completa, puerta, saldo y primer cobro;
 *  C · la pasada: puerta cerrada y fallas de Weë paran el reloj; se reanuda; cobra
 *      el bloque que toca; sin saldo se para; solo actúa cuando puede; termina;
 *  D · apagar y lo que ve la app;
 *  E · reglas del repo: WeeTalk intacto, catálogo, reglas, puerta cerrada, exportación.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const S = lib('personajes/servidor.js');
const P = lib('personajes/pase.js');
const H = P.MS_POR_HORA;

const FICHA = { nombre: 'Jay Reads', resumen: 'Escritor de fantasía', personalidad: 'Curioso y cercano', rasgos: ['curioso'], tono: 'cercano', nivel: 'alto' };
const PERFIL = { uid: 'hidi_cuenta1', profileType: 'hidi', linkedAccountId: 'cuenta1' };
function mundo({ abierta = true, saldo = 1000, ficha = FICHA, perfil = PERFIL, sano = true } = {}) {
  const m = { reloj: 1_000_000_000, estados: {}, cobros: [], saldo, sano, actuaciones: 0, abierta };
  m.deps = {
    ahora: () => m.reloj,
    config: async () => ({ ...P.CONFIG_DEL_PASE_POR_DEFECTO, abierta: m.abierta }),
    leerPerfil: async (id) => (id === 'hidi_cuenta1' ? perfil : null),
    leerFicha: async () => ficha,
    leerEstado: async (id) => m.estados[id] || null,
    guardarEstado: async (id, e) => { m.estados[id] = JSON.parse(JSON.stringify(e)); },
    cobrar: async (cuenta, requestId, creditos) => {
      if (m.cobros.some((c) => c.requestId === requestId)) return 'cobrado';
      if (m.saldo < creditos) return 'sinSaldo';
      m.saldo -= creditos; m.cobros.push({ cuenta, requestId, creditos }); return 'cobrado';
    },
    weeSano: async () => m.sano,
    cobroDisponible: () => m.cobroDisponible !== false,
    actuar: async (e) => { m.actuaciones++; return e; },
  };
  return m;
}

console.log('\n── A · La ficha del servidor es la misma de la app ──');
{
  const servidor = leer('functions/src/personajes/ficha.ts');
  const marca = '// ── COPIA EXACTA DESDE AQUÍ ──\n';
  const copia = servidor.slice(servidor.indexOf(marca) + marca.length);
  check('después de la marca, el archivo del servidor es idéntico al de la app', servidor.includes(marca) && copia === leer('utils/personajeFicha.ts'));
}

console.log('\n── B · Programar ──');
{
  let m = mundo();
  let r = await S.programarAutonomia(m.deps, 'otra-cuenta', 'hidi_cuenta1', 1);
  check('otra cuenta no puede programar un personaje ajeno', !r.ok && r.motivo === 'noEsTuPersonaje');
  m = mundo({ perfil: { ...PERFIL, linkedAccountId: 'otra' } });
  r = await S.programarAutonomia(m.deps, 'cuenta1', 'hidi_cuenta1', 1);
  check('si el vínculo del perfil no coincide, tampoco (se lee, no se deduce del prefijo)', !r.ok && r.motivo === 'noEsTuPersonaje');
  m = mundo({ ficha: { nombre: 'Jay' } });
  r = await S.programarAutonomia(m.deps, 'cuenta1', 'hidi_cuenta1', 1);
  check('con la ficha incompleta no se activa', !r.ok && r.motivo === 'fichaIncompleta');
  m = mundo({ abierta: false });
  r = await S.programarAutonomia(m.deps, 'cuenta1', 'hidi_cuenta1', 1);
  check('con la puerta cerrada no se activa', !r.ok && r.motivo === 'puertaCerrada' && m.cobros.length === 0);
  m = mundo(); m.cobroDisponible = false;
  r = await S.programarAutonomia(m.deps, 'cuenta1', 'hidi_cuenta1', 1);
  check('sin el servicio del pase en el catálogo de Credits: no se activa, no cobra y no guarda (falla cerrado)', !r.ok && r.motivo === 'cobroNoDisponible' && m.cobros.length === 0 && !m.estados.hidi_cuenta1);
  m = mundo({ saldo: 10 });
  r = await S.programarAutonomia(m.deps, 'cuenta1', 'hidi_cuenta1', 1);
  check('sin saldo para el primer bloque: no se activa y no queda nada guardado', !r.ok && r.motivo === 'sinSaldo' && !m.estados.hidi_cuenta1);
  m = mundo();
  r = await S.programarAutonomia(m.deps, 'cuenta1', 'hidi_cuenta1', 3);
  check('programado por 3 días: cobra SOLO el primer bloque, 30 Credits, a la cuenta dueña', r.ok && m.cobros.length === 1 && m.cobros[0].creditos === 30 && m.cobros[0].cuenta === 'cuenta1' && m.saldo === 970);
  check('el cobro lleva el id idempotente del bloque', m.cobros[0].requestId === P.idDeCobro(r.estado, 0));
  check('queda guardado activo, con el nivel de la ficha', m.estados.hidi_cuenta1.estado === 'activa' && m.estados.hidi_cuenta1.nivel === 'alto' && m.estados.hidi_cuenta1.bloquesCobrados === 1);
  r = await S.programarAutonomia(m.deps, 'cuenta1', 'hidi_cuenta1', 1);
  check('no se programa otro encima de uno vivo', !r.ok && r.motivo === 'yaActivo' && m.cobros.length === 1);
  r = await S.programarAutonomia(m.deps, 'cuenta1', 'hidi_cuenta1', 2);
  check('una duración que no está permitida se rechaza', !r.ok);
}

console.log('\n── C · La pasada del ciclo ──');
{
  const m = mundo();
  await S.programarAutonomia(m.deps, 'cuenta1', 'hidi_cuenta1', 3);
  let e = m.estados.hidi_cuenta1;
  m.reloj += 2 * H; e = await S.procesarPase(m.deps, e);
  check('activo y pagado: actúa', m.actuaciones === 1 && e.estado === 'activa');
  m.abierta = false; m.reloj += H; e = await S.procesarPase(m.deps, e);
  check('puerta cerrada: se pausa «por Weë» y no actúa', e.estado === 'pausadaPorWee' && e.motivo === 'puertaCerrada' && m.actuaciones === 1);
  const usado = P.tiempoUsado(e, m.reloj);
  m.reloj += 10 * H; e = await S.procesarPase(m.deps, e);
  check('mientras está cerrada, el reloj no corre', P.tiempoUsado(e, m.reloj) === usado);
  m.abierta = true; m.sano = false; e = await S.procesarPase(m.deps, e);
  check('abierta pero con Weë caído: sigue pausado por falla', e.estado === 'pausadaPorWee' && e.motivo === 'falloDeWee');
  m.sano = true; e = await S.procesarPase(m.deps, e);
  check('Weë se recupera: se reanuda y vuelve a actuar', e.estado === 'activa' && m.actuaciones === 2);
  m.reloj += 21 * H; e = await S.procesarPase(m.deps, e);
  check('al cumplir 24 h de servicio cobra el bloque 2 (las horas de falla no contaron)', m.cobros.length === 2 && e.bloquesCobrados === 2);
  m.saldo = 0; m.reloj += 24 * H; e = await S.procesarPase(m.deps, e);
  check('sin saldo para el bloque 3: se para y no actúa', e.estado === 'pausadaSinSaldo' && m.cobros.length === 2);
  const acts = m.actuaciones;
  m.reloj += 50 * H; e = await S.procesarPase(m.deps, e);
  check('parado por saldo, no consume tiempo ni actúa', e.estado === 'pausadaSinSaldo' && m.actuaciones === acts);
  m.saldo = 100; e = await S.procesarPase(m.deps, e);
  check('con saldo de nuevo, cobra el bloque 3 y sigue', e.estado === 'activa' && m.cobros.length === 3);
  m.reloj += 25 * H; e = await S.procesarPase(m.deps, e);
  check('cumplidos los 3 días: termina y no cobra más (sin renovación automática)', e.estado === 'terminada' && m.cobros.length === 3);
  const fin = m.actuaciones; e = await S.procesarPase(m.deps, e);
  check('terminado, una pasada más no hace nada', m.actuaciones === fin && m.cobros.length === 3);
}

console.log('\n── D · Apagar y lo que ve la app ──');
{
  const m = mundo();
  await S.programarAutonomia(m.deps, 'cuenta1', 'hidi_cuenta1', 7);
  check('otra cuenta no apaga un personaje ajeno', !(await S.apagarAutonomia(m.deps, 'otra', 'hidi_cuenta1')).ok);
  const r = await S.apagarAutonomia(m.deps, 'cuenta1', 'hidi_cuenta1');
  check('el dueño apaga: queda apagado', r.ok && m.estados.hidi_cuenta1.estado === 'apagada');
  m.reloj += 100 * H; await S.procesarPase(m.deps, m.estados.hidi_cuenta1);
  check('los 6 bloques que no empezaron no se cobran nunca', m.cobros.length === 1);
  const v = await S.estadoDeAutonomia(m.deps, 'cuenta1', 'hidi_cuenta1');
  check('la vista dice estado, tiempo y precio', v.ok && v.vista.pase.estado === 'apagada' && v.vista.creditosPorBloque === 30 && Array.isArray(v.vista.bloquesPermitidos));
  check('y no enseña datos internos (cuenta que paga, ids de cobro)', !('cuentaId' in v.vista.pase) && !('programadoEn' in v.vista.pase) && !JSON.stringify(v.vista).includes('autonomia_hidi'));
  check('otra cuenta no puede ver el estado', !(await S.estadoDeAutonomia(m.deps, 'otra', 'hidi_cuenta1')).ok);
}

console.log('\n── D2 · La bandeja de aprobación ──');
{
  const m = mundo();
  const avisos = { a1: { tipo: 'aprobacion', accion: 'publicar', borrador: { texto: 'Hoy terminé el capítulo del dragón.' }, estado: 'pendiente', creadoEn: m.reloj, caducaEn: m.reloj + 24 * H }, a2: { tipo: 'delicado', caso: 'dinero_o_pagos', estado: 'pendiente', creadoEn: m.reloj, caducaEn: m.reloj + 24 * H }, a3: { tipo: 'aprobacion', accion: 'publicar', borrador: { texto: 'viejo' }, estado: 'pendiente', creadoEn: m.reloj, caducaEn: m.reloj - 1 } };
  const publicadas = [];
  Object.assign(m.deps, {
    leerAviso: async (id, avisoId) => avisos[avisoId] || null,
    marcarAviso: async (id, avisoId, estado) => { avisos[avisoId].estado = estado; },
    publicar: async (id, texto, docId) => { if (publicadas.some((p) => p.docId === docId)) return false; publicadas.push({ id, texto, docId }); return true; },
  });
  check('otra cuenta no aprueba nada', (await S.resolverAviso(m.deps, 'otra', 'hidi_cuenta1', 'a1', true)).motivo === 'noEsTuPersonaje' && publicadas.length === 0);
  const r = await S.resolverAviso(m.deps, 'cuenta1', 'hidi_cuenta1', 'a1', true);
  check('aprobar publica el borrador TAL CUAL, como el personaje', r.ok && publicadas.length === 1 && publicadas[0].texto === 'Hoy terminé el capítulo del dragón.' && publicadas[0].id === 'hidi_cuenta1' && avisos.a1.estado === 'aprobado');
  check('aprobar no cobra nada (el borrador ya se hizo dentro del pase)', m.cobros.length === 0);
  check('aprobar dos veces no publica dos veces', (await S.resolverAviso(m.deps, 'cuenta1', 'hidi_cuenta1', 'a1', true)).motivo === 'yaResuelto' && publicadas.length === 1);
  check('un aviso de tema delicado no se «aprueba»', (await S.resolverAviso(m.deps, 'cuenta1', 'hidi_cuenta1', 'a2', true)).motivo === 'avisoNoEncontrado');
  check('lo caducado (24 h) no se publica nunca y queda marcado', (await S.resolverAviso(m.deps, 'cuenta1', 'hidi_cuenta1', 'a3', true)).motivo === 'avisoCaducado' && avisos.a3.estado === 'caducado' && publicadas.length === 1);
  avisos.a4 = { ...avisos.a1, estado: 'pendiente' };
  check('rechazar no publica y queda marcado', (await S.resolverAviso(m.deps, 'cuenta1', 'hidi_cuenta1', 'a4', false)).ok && avisos.a4.estado === 'rechazado' && publicadas.length === 1);
  check('un aviso que no existe', (await S.resolverAviso(m.deps, 'cuenta1', 'hidi_cuenta1', 'nada', true)).motivo === 'avisoNoEncontrado');
  const srv = leer('functions/src/personajes/servidor.ts');
  check('la app llega por la misma función: accion aprobar / rechazar con avisoId validado', /data\.accion === 'aprobar' \|\| data\.accion === 'rechazar'/.test(srv) && /avisoId/.test(srv));
}

console.log('\n── E · Reglas del repositorio ──');
{
  const srv = leer('functions/src/personajes/servidor.ts');
  check('cobra con el Credit Engine de siempre, con su servicio y como «autonomía»', /creditEngine\.spendCredits\(\{ userId: cuentaId, service: SERVICIO_DEL_PASE/.test(srv) && /creditEngine\.completeCredits/.test(srv) && /source: 'autonomia'/.test(srv));
  check('sin saldo es un estado, no un error', /INSUFFICIENT_CREDITS/.test(srv));
  check('si no puede leer la configuración, la puerta queda CERRADA', /abierta: false/.test(srv) && P.CONFIG_DEL_PASE_POR_DEFECTO.abierta === false);
  check('no toca WeeTalk: ni importa sus módulos ni los mensajes', !/social\/weetalk|messages|conversations/.test(sinComentarios(srv)));
  const weetalk = ['functions/src/social/weetalk.ts'].filter((f) => fs.existsSync(path.resolve(here, '../../' + f)));
  check('y WeeTalk sigue sin importar nada de Credits ni de personajes', weetalk.every((f) => !/credits|personajes/.test(sinComentarios(leer(f)))));
  const cat = leer('functions/src/credits/creditCosts.ts');
  check('el pase está en el catálogo (autorizado por el dueño): 30 Credits, con su nombre visible', /wee_autonomy_pass: 30,/.test(cat) && /wee_autonomy_pass: 'Autonomía del personaje \(24 h\)'/.test(cat) && S.servicioDelPaseDisponible() === true && /AUTORIZACIÓN EXPLÍCITA/.test(cat));
  const reglas = leer('firestore.rules');
  check('el estado del pase lo escribe solo el servidor y lo lee solo el dueño', /match \/characterAutonomy\/\{perfilId\} \{\s*allow read: if isAuthenticated\(\) && esMia\(perfilId\);\s*allow write: if false;/.test(reglas)); // F3: un pase por alter ego
  const idx = leer('functions/src/index.ts');
  check('se exportan la llamada y el ciclo, con su explicación', /export \{ autonomiaPersonaje(, nivelDelPaseAlGuardarLaFicha)? \} from '\.\/personajes\/servidor'/.test(idx) && /export \{ cicloDeAutonomia \} from '\.\/personajes\/ciclo'/.test(idx) && /CERRADA por defecto/.test(idx));
  const ciclo = leer('functions/src/personajes/ciclo.ts');
  check('el ciclo pone al día cada pase en una transacción y publica FUERA de ella (sin efectos repetidos)', /await db\(\)\.runTransaction\(async \(tx\) => \{\s*const fresco = await tx\.get\(doc\.ref\);/.test(ciclo) && ciclo.indexOf('accionPropia(publicar') > ciclo.indexOf('runTransaction') && /alDia\.estado !== 'activa' \|\| !config\.abierta/.test(ciclo));
  check('esta suite está en la cadena de `npm test`', /personaje-servidor\.test\.mjs/.test(leer('functions/package.json')));
}

/*
 * F5 DEL PLAN DE ALTER EGOS (2026-11-23): cada alter ego —heredado o `ent_…`— tiene su propio pase, cobrado a la
 * billetera de la CUENTA dueña, resuelta LEYENDO (`cuentaDelPerfil` = `cuentaDelPerfilLeido`). Sin tope de pases
 * activos por cuenta (decisión del dueño, D4): cada uno paga el suyo.
 */
console.log('\n── F · F5: N alter egos, cada uno con su pase ──');
{
  const PERFILES = {
    hidi_cuenta1: PERFIL,
    ent_lina0001: { uid: 'ent_lina0001', profileType: 'hidi', entityId: 'e1' },
    ent_mara0002: { uid: 'ent_mara0002', profileType: 'hidi', entityId: 'e2' },
    ent_ajeno0003: { uid: 'ent_ajeno0003', profileType: 'hidi', entityId: 'e3' },
    usuario_real: { uid: 'usuario_real', profileType: 'real' },
  };
  const DUENO = { hidi_cuenta1: 'cuenta1', ent_lina0001: 'cuenta1', ent_mara0002: 'cuenta1', ent_ajeno0003: 'otra', usuario_real: 'cuenta1' };
  const m = mundo();
  m.deps.leerPerfil = async (id) => PERFILES[id] ?? null;
  m.deps.cuentaDelPerfil = async (id, perfil) => (perfil ? DUENO[id] ?? null : null);
  const ids = ['hidi_cuenta1', 'ent_lina0001', 'ent_mara0002'];
  const rs = [];
  for (const id of ids) rs.push(await S.programarAutonomia(m.deps, 'cuenta1', id, 1));
  check('F5) tres caras de una cuenta (heredada + dos `ent_`) activan cada una su pase: sin tope por cuenta', rs.every((r) => r.ok) && ids.every((id) => m.estados[id]?.personajeId === id));
  check('F5) cada pase se cobra aparte (30 Credits) y siempre a la billetera de la cuenta dueña', m.cobros.length === 3 && m.cobros.every((c) => c.cuenta === 'cuenta1' && c.creditos === 30) && new Set(m.cobros.map((c) => c.requestId)).size === 3);
  check('F5) cada pase guarda la cuenta que paga (de ahí salen las acciones y los encargos)', ids.every((id) => m.estados[id].cuentaId === 'cuenta1'));
  const ajeno = await S.programarAutonomia(m.deps, 'cuenta1', 'ent_ajeno0003', 1);
  check('F5) el alter ego `ent_` de OTRA cuenta no se programa (lo dice su entidad leída, no su prefijo)', !ajeno.ok && ajeno.motivo === 'noEsTuPersonaje' && m.cobros.length === 3);
  const real = await S.programarAutonomia(m.deps, 'cuenta1', 'usuario_real', 1);
  check('F5) el Perfil Real no es un personaje aunque sea de la cuenta (profileType leído)', !real.ok && real.motivo === 'noEsTuPersonaje');
  const srv = sinComentarios(leer('functions/src/personajes/servidor.ts'));
  check('F5) el servidor real resuelve el dueño con `cuentaDelPerfilLeido` y no cuenta pases por cuenta', /cuentaDelPerfil: \(id, perfil\) => cuentaDelPerfilLeido\(db\(\), id, perfil\)/.test(srv) && !/pasesActivos|MAX_PASES/i.test(srv));
  const mat = sinComentarios(leer('functions/src/personajes/materialServidor.ts'));
  check('F5) el material resuelve el dueño igual (heredado o `ent_`)', /cuentaDelPerfilLeido\(db\(\), perfilId, perfil\)/.test(mat) && !/startsWith\(/.test(mat));
}

console.log('\nServidor del pase: programar, cobrar por bloque, pausas, apagar y reglas');
if (failures > 0) { console.error(`\n${failures} comprobación(es) fallida(s)`); process.exit(1); }
