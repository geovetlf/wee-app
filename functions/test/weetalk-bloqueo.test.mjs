/*
 * WEETALK · BLOQUEO DE CONTACTOS — la regla común, el motor y lo que no se puede filtrar (docs/WEETALK-BLOQUEO.md).
 *
 *   node test/weetalk-bloqueo.test.mjs
 *
 * Sin emulador: la regla es pura, y el motor se recorre DE VERDAD (el compilado de functions/lib) sobre la Firestore
 * en memoria de las suites de aceptación. Lo que exige las reglas de Firestore —que el mensaje o el aviso no lleguen a
 * guardarse— es una PROPUESTA sin aplicar (ops/propuestas/weetalk-bloqueo): aquí se comprueba que compone sobre las
 * reglas de hoy y que no está aplicada; ejecutarla en el emulador es `ops/propuestas/weetalk-bloqueo/correr-reglas.mjs`.
 *
 * Decisiones definitivas del dueño (2026-11-07): el bloqueo es de CUENTA, cubre las identidades Real y Weë, B no
 * contacta con ninguna identidad de A ni lo evade cambiando de identidad, impide mensajes, conversaciones nuevas,
 * solicitudes de ËContact y llamadas (si existen), anula las solicitudes pendientes, desbloquear no restaura nada, no
 * revela identidades alternativas y no abre casos de moderación.
 *
 *   A  la regla común «¿puede X contactar con Y?», por cuentas, contra una especificación escrita aparte
 *   B  el índice que leen las reglas y ËContact dice exactamente lo mismo que la regla (256 configuraciones, 2048 casos)
 *   C  lo guardado se lee con desconfianza
 *   D  el motor: bloquear, idempotencia, las dos caras, evasión, el aviso push, desbloquear, la lista y los errores
 *   E  privacidad: la lista solo es de quien bloquea, nadie se entera, y nada delata la otra cara de nadie
 *   F  sin inspección: la lógica del bloqueo no lee mensajes ni toca la moderación
 *   G  el cableado: los dos push, ËContact, las callables, el despliegue, la cadena y el dominio
 *   H  la propuesta de reglas: compone, cubre los caminos del cliente y NO está aplicada
 *   I  sabotaje: con la regla rota a propósito, estas comprobaciones fallan
 *   J  ËContact: pedir y aceptar se niegan, las pendientes se anulan, desbloquear no las restaura
 *   K  el límite contra intentos reiterados de contactar a quien te bloqueó: por cuenta y operación, genérico, sin
 *      suspensiones y sin que un tercero pueda gastar el cupo de otro
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const B = require(path.join(RAIZ, 'functions/lib/social/weetalkBloqueos.js'));
const I = require(path.join(RAIZ, 'functions/lib/social/bloqueosIndice.js'));
const EC = require(path.join(RAIZ, 'functions/lib/social/econtact.js'));
const { identidadesHeredadasDeLaCuenta: carasDe } = require(path.join(RAIZ, 'functions/lib/identity/compatibilidad.js'));
const { BaseEnMemoria } = await import(pathToFileURL(path.join(aqui, '_firestore-en-memoria.mjs')).href);
const E = await import(pathToFileURL(path.join(RAIZ, 'ops/propuestas/weetalk-bloqueo/escenario.mjs')).href);
const P = await import(pathToFileURL(path.join(RAIZ, 'ops/propuestas/weetalk-bloqueo/componer.mjs')).href);

let failures = 0;
let n = 1;
const check = (nombre, cond, extra = '') => {
  console.log(`${cond ? '✔' : '✘'} ${n++}) ${nombre}${extra ? ` — ${extra}` : ''}`);
  if (!cond) failures++;
};
const rechaza = async (promesa) => { try { await promesa; return null; } catch (e) { return e; } };

const { ana, beto, carla } = E.CUENTAS;
const { anaReal, anaWee, betoReal, betoWee, carlaReal } = E.CARAS;
const cuentaDeLaCara = (c) => E.CUENTA_DE_LA_CARA[c];
const conCuenta = (identidad) => ({ identidad, cuenta: cuentaDeLaCara(identidad) });
const relacion = (cuentaQueBloquea, cuentaBloqueada, pares) => ({
  cuentaQueBloquea, cuentaBloqueada, entradas: pares.map(([caraQueBloquea, caraBloqueada]) => ({ caraQueBloquea, caraBloqueada, desde: 1 })),
});
/* Las caras de las dos cuentas del escenario, tal como las compone la frontera de compatibilidad. */
const carasDeAna = carasDe(ana);
const carasDeBeto = carasDe(beto);
const cruzadas = [...carasDeAna.flatMap((x) => carasDeBeto.map((y) => [x, y])), ...carasDeBeto.flatMap((x) => carasDeAna.map((y) => [x, y]))];
const decide = (motor, relAB, relBA, de, para) => motor({
  de: conCuenta(de), para: conCuenta(para),
  bloqueoDelDestino: cuentaDeLaCara(para) === ana ? relAB : relBA,
  bloqueoPropio: cuentaDeLaCara(de) === ana ? relAB : relBA,
});

console.log('── A · La regla común, contra la especificación del dueño ──');
{
  check('la frontera de compatibilidad da las dos caras de cada cuenta del escenario, y las caras del escenario son esas',
    JSON.stringify(carasDeAna) === JSON.stringify([anaReal, anaWee]) && JSON.stringify(carasDeBeto) === JSON.stringify([betoReal, betoWee]));
  const relAB = relacion(ana, beto, [[anaReal, betoWee]]);
  const malos = cruzadas.filter(([de, para]) => decide(B.puedeEscribir, relAB, null, de, para).puede === E.PROHIBIDO_EN_EL_ESCENARIO.has(`${de}~${para}`));
  check('las 8 combinaciones Real/Weë entre las dos cuentas, como dice la especificación (las 8 prohibidas)', malos.length === 0 && E.PROHIBIDO_EN_EL_ESCENARIO.size === 8, malos.map((m) => m.join('→')).join(', '));
  const protegida = decide(B.puedeEscribir, relAB, null, betoWee, anaReal);
  const evasion = decide(B.puedeEscribir, relAB, null, betoReal, anaReal);
  check('Beto no contacta con la cara de Ana que lo bloqueó, y cambiar de cara NO lo evade', !protegida.puede && !evasion.puede && protegida.motivo === 'bloqueo-del-destino' && evasion.motivo === 'bloqueo-del-destino');
  check('Beto TAMPOCO contacta con la otra cara de Ana: el bloqueo cubre todas las identidades de quien bloquea',
    !decide(B.puedeEscribir, relAB, null, betoReal, anaWee).puede && !decide(B.puedeEscribir, relAB, null, betoWee, anaWee).puede);
  const bloqueada = decide(B.puedeEscribir, relAB, null, anaReal, betoWee);
  const desdeOtra = decide(B.puedeEscribir, relAB, null, anaWee, betoWee);
  check('Ana no contacta con la cara que bloqueó, ni desde su otra cara (hasta desbloquear)', !bloqueada.puede && !desdeOtra.puede && bloqueada.motivo === 'bloqueo-propio' && desdeOtra.motivo === 'bloqueo-propio');
  check('ni con la otra cara de Beto: el bloqueo es de cuenta en los dos sentidos',
    !decide(B.puedeEscribir, relAB, null, anaReal, betoReal).puede && !decide(B.puedeEscribir, relAB, null, anaWee, betoReal).puede);
  check('las dos caras de una misma cuenta nunca se bloquean entre sí',
    B.puedeEscribir({ de: conCuenta(anaReal), para: conCuenta(anaWee), bloqueoDelDestino: relAB, bloqueoPropio: relAB }).puede);
  check('una relación que no habla de esas dos cuentas, en ese orden, no cuenta',
    B.puedeEscribir({ de: conCuenta(betoWee), para: conCuenta(anaReal), bloqueoDelDestino: relacion(ana, carla, [[anaReal, carlaReal]]), bloqueoPropio: null }).puede
    && B.puedeEscribir({ de: conCuenta(betoWee), para: conCuenta(anaReal), bloqueoDelDestino: null, bloqueoPropio: relAB }).puede);
  check('una relación sin ninguna entrada no bloquea nada', cruzadas.every(([de, para]) => decide(B.puedeEscribir, relacion(ana, beto, []), null, de, para).puede));
  check('sin bloqueos, todo se puede', cruzadas.every(([de, para]) => decide(B.puedeEscribir, null, null, de, para).puede));
  check('la regla no recibe el mensaje: solo quién y a quién (dos caras con su cuenta y dos relaciones)', B.puedeEscribir.length === 1
    && /bloqueoDelDestino/.test(B.puedeEscribir.toString()) && !/content|text|imageUrl|message/i.test(B.puedeEscribir.toString()));
}

console.log('\n── B · El índice de las reglas y de ËContact dice exactamente lo mismo que la regla ──');
{
  const posiblesAB = cruzadas.filter(([x]) => cuentaDeLaCara(x) === ana);
  const posiblesBA = cruzadas.filter(([x]) => cuentaDeLaCara(x) === beto);
  let casos = 0;
  const malos = [];
  for (let m1 = 0; m1 < 16; m1++) for (let m2 = 0; m2 < 16; m2++) {
    const relAB = m1 ? relacion(ana, beto, posiblesAB.filter((_, i) => m1 & (1 << i))) : null;
    const relBA = m2 ? relacion(beto, ana, posiblesBA.filter((_, i) => m2 & (1 << i))) : null;
    const pares = new Set(B.paresBloqueados([relAB, relBA], carasDe));
    for (const [de, para] of cruzadas) {
      casos++;
      if (decide(B.puedeEscribir, relAB, relBA, de, para).puede === pares.has(B.claveDePar(de, para))) malos.push(`${m1}/${m2} ${de}→${para}`);
    }
  }
  check(`para cualquier combinación de entradas en los dos sentidos, «puede» ⇔ «no está en el índice» (${casos} casos)`, casos === 2048 && malos.length === 0, malos.slice(0, 3).join(' · '));
  check('el bloqueo del escenario deja escritos exactamente sus ocho pares',
    JSON.stringify(B.paresBloqueados([E.BLOQUEO_DE_ANA], carasDe)) === JSON.stringify(E.PARES_DEL_BLOQUEO_DE_ANA) && E.PARES_DEL_BLOQUEO_DE_ANA.length === 8);
  check('entre dos cuentas caben ocho pares, en los dos sentidos; entre una cuenta y ella misma, ninguno',
    B.paresPosibles(ana, beto, carasDe).length === 8 && B.paresPosibles(ana, ana, carasDe).length === 0 && B.paresPosibles('no/es-cuenta', beto, carasDe).length === 0);
  check('el índice incluye la cara Weë de una cuenta aunque todavía no exista: el día que la cree ya está cubierta',
    B.paresBloqueados([relacion(ana, beto, [[anaReal, betoReal]])], carasDe).includes(`${betoWee}~${anaReal}`));
  check('la clave del par es la que compone la propuesta de reglas (`de + \'~\' + para`)',
    B.claveDePar(betoWee, anaReal) === `${betoWee}${P.SEPARADOR_DEL_INDICE}${anaReal}` && B.PARES === P.COLECCION_DEL_INDICE);
  check('y la colección y la clave salen del módulo compartido que también lee ËContact (bloqueosIndice)',
    I.PARES_BLOQUEADOS === B.PARES && I.claveDePar(anaWee, betoReal) === B.claveDePar(anaWee, betoReal) && I.SEPARADOR_DE_PAR === P.SEPARADOR_DEL_INDICE);
}

console.log('\n── C · Lo guardado, leído con desconfianza ──');
{
  const bueno = { cuentaQueBloquea: ana, cuentaBloqueada: beto, entradas: [{ caraQueBloquea: anaReal, caraBloqueada: betoWee, desde: 5 }] };
  check('una relación bien escrita se lee entera', JSON.stringify(B.relacionGuardada(bueno, ana, beto, carasDe)) === JSON.stringify({ ...bueno }));
  check('una entrada con una cara que no es de su cuenta se ignora (y si no queda ninguna, no hay relación)',
    B.relacionGuardada({ ...bueno, entradas: [{ caraQueBloquea: carlaReal, caraBloqueada: betoWee }] }, ana, beto, carasDe) === null
    && B.relacionGuardada({ ...bueno, entradas: [{ caraQueBloquea: anaReal, caraBloqueada: carlaReal }] }, ana, beto, carasDe) === null);
  check('un documento que dice otras cuentas, o la misma dos veces, no decide nada',
    B.relacionGuardada(bueno, beto, ana, carasDe) === null && B.relacionGuardada({ ...bueno, cuentaBloqueada: ana }, ana, ana, carasDe) === null
    && B.relacionGuardada(null, ana, beto, carasDe) === null && B.relacionGuardada('x', ana, beto, carasDe) === null);
  check('las entradas repetidas cuentan una vez y el instante sale de un Timestamp o de un número',
    B.relacionGuardada({ ...bueno, entradas: [bueno.entradas[0], bueno.entradas[0], { caraQueBloquea: anaWee, caraBloqueada: betoWee, desde: { toMillis: () => 9 } }] }, ana, beto, carasDe)
      .entradas.map((e) => e.desde).join(',') === '5,9');
}

/* ── El mundo del motor: perfiles como los deja la app, en una Firestore en memoria ──────────────────────────── */
const nuevoMundo = () => {
  const base = new BaseEnMemoria();
  base.docs.set(`users/${anaReal}`, { uid: anaReal, profileType: 'real', linkedAccountId: anaWee, displayName: 'Ana' });
  base.docs.set(`users/${anaWee}`, { uid: anaWee, profileType: 'hidi', linkedAccountId: ana, displayName: 'Nube' });
  base.docs.set(`users/${betoReal}`, { uid: betoReal, profileType: 'real', linkedAccountId: betoWee, displayName: 'Beto' });
  base.docs.set(`users/${betoWee}`, { uid: betoWee, profileType: 'hidi', linkedAccountId: beto, displayName: 'Sombra' });
  base.docs.set(`users/doc_auto_carla`, { uid: carlaReal, displayName: 'Carla' });
  let reloj = 1_000;
  const motor = B.createBloqueosEngine({ db: () => base, ahora: () => (reloj += 10), sello: (ms) => ms, carasDe });
  return { base, motor };
};
const indiceDe = (base) => base.de(B.PARES).map((d) => d.id).sort();
const coleccionesDe = (base) => [...new Set([...base.docs.keys()].map((k) => k.split('/')[0]))].sort();

console.log('\n── D · El motor: bloquear, el aviso push, desbloquear y los errores ──');
{
  const { base, motor } = nuevoMundo();
  const r1 = await motor.bloquear({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: betoWee });
  check('Ana bloquea el Perfil Weë de Beto desde su Perfil Real', r1.bloqueado === true && r1.identidad === betoWee && r1.yaEstaba === false, JSON.stringify(r1));
  const rel = base.leer(`${B.BLOQUEOS}/${ana}~${beto}`);
  check('se guarda UNA relación entre las dos CUENTAS, con su entrada (cara que bloquea → cara bloqueada)',
    rel && rel.cuentaQueBloquea === ana && rel.cuentaBloqueada === beto && rel.entradas.length === 1
    && rel.entradas[0].caraQueBloquea === anaReal && rel.entradas[0].caraBloqueada === betoWee && base.de(B.BLOQUEOS).length === 1);
  check('y el índice queda con los ocho pares de la especificación', JSON.stringify(indiceDe(base)) === JSON.stringify(E.PARES_DEL_BLOQUEO_DE_ANA), indiceDe(base).join(' '));
  check('el cupo cuenta UNA cuenta bloqueada', base.leer(`${B.CUPOS}/${ana}`)?.relaciones === 1);
  const r2 = await motor.bloquear({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: betoWee });
  check('repetirlo es idempotente: «ya estaba», misma relación, mismo índice, mismo cupo',
    r2.yaEstaba === true && base.leer(`${B.BLOQUEOS}/${ana}~${beto}`).entradas.length === 1
    && JSON.stringify(indiceDe(base)) === JSON.stringify(E.PARES_DEL_BLOQUEO_DE_ANA) && base.leer(`${B.CUPOS}/${ana}`).relaciones === 1);

  const aviso = (de, para) => motor.permiteAviso(conCuenta(de), conCuenta(para));
  check('push: un mensaje de Beto (Weë) no suena en el teléfono de Ana', (await aviso(betoWee, anaReal)) === false);
  check('push: Beto cambia de cara (Real) y tampoco suena: la evasión no funciona', (await aviso(betoReal, anaReal)) === false);
  check('push: tampoco a la otra cara de Ana, desde ninguna cara de Beto', (await aviso(betoReal, anaWee)) === false && (await aviso(betoWee, anaWee)) === false);
  check('push: lo de Ana a Beto tampoco, a ninguna de sus caras', (await aviso(anaReal, betoWee)) === false && (await aviso(anaWee, betoWee)) === false
    && (await aviso(anaReal, betoReal)) === false && (await aviso(anaWee, betoReal)) === false);
  check('push: Carla, que no tiene nada que ver, suena como siempre', (await aviso(carlaReal, anaReal)) === true && (await aviso(anaReal, carlaReal)) === true);
  check('push: falla cerrada sin cuenta, o con una cara que no es de la cuenta que dice',
    (await motor.permiteAviso({ identidad: betoWee, cuenta: null }, conCuenta(anaReal))) === false
    && (await motor.permiteAviso({ identidad: betoWee, cuenta: carla }, conCuenta(anaReal))) === false
    && (await motor.permiteAviso(conCuenta(betoWee), { identidad: anaReal, cuenta: null })) === false);
  const roto = B.createBloqueosEngine({ db: () => { throw new Error('Firestore no responde'); }, ahora: () => 0, sello: (x) => x, carasDe });
  const errorAntes = console.error;
  console.error = () => {};
  const conFallo = await roto.permiteAviso(conCuenta(betoWee), conCuenta(anaReal));
  console.error = errorAntes;
  check('push: si los bloqueos no se pueden leer, no suena (y se anota, no se calla)', conFallo === false);

  /* Beto bloquea también a Ana (desde su Perfil Real, viendo la cara Weë de Ana): dos relaciones, un mismo cierre. */
  await motor.bloquear({ cuentaDeLaSesion: beto, comoIdentidad: betoReal, identidad: anaWee });
  const ambos = B.paresBloqueados([B.relacionGuardada(base.leer(`${B.BLOQUEOS}/${ana}~${beto}`), ana, beto, carasDe), B.relacionGuardada(base.leer(`${B.BLOQUEOS}/${beto}~${ana}`), beto, ana, carasDe)], carasDe);
  check('si Beto también bloquea a Ana, hay dos relaciones independientes y el índice sigue cerrando los ocho pares',
    JSON.stringify(indiceDe(base)) === JSON.stringify(ambos) && ambos.length === 8 && base.de(B.BLOQUEOS).length === 2, `${ambos.length} pares`);

  const d1 = await motor.desbloquear({ cuentaDeLaSesion: ana, identidad: betoWee });
  check('Ana desbloquea: «estaba», su relación desaparece y su cupo baja', d1.estaba === true && d1.bloqueado === false
    && !base.leer(`${B.BLOQUEOS}/${ana}~${beto}`) && base.leer(`${B.CUPOS}/${ana}`).relaciones === 0);
  const soloDeBeto = B.paresBloqueados([B.relacionGuardada(base.leer(`${B.BLOQUEOS}/${beto}~${ana}`), beto, ana, carasDe)], carasDe);
  check('y en el índice queda lo que Beto sigue bloqueando: desbloquear uno no abre lo que el otro cierra',
    JSON.stringify(indiceDe(base)) === JSON.stringify(soloDeBeto) && soloDeBeto.length === 8);
  check('así que, mientras Beto no desbloquee, sigue sin sonar nada entre las dos cuentas', (await aviso(betoWee, anaReal)) === false && (await aviso(anaReal, betoReal)) === false);
  const d2 = await motor.desbloquear({ cuentaDeLaSesion: ana, identidad: betoWee });
  check('desbloquear otra vez no es un error: «no estaba»', d2.estaba === false && d2.bloqueado === false);
  await motor.desbloquear({ cuentaDeLaSesion: beto, identidad: anaWee });
  check('cuando nadie bloquea a nadie, el índice entre las dos cuentas queda vacío', indiceDe(base).length === 0 && base.de(B.BLOQUEOS).length === 0);
  check('y todo vuelve a las reglas normales: los avisos suenan otra vez en los dos sentidos', (await aviso(betoWee, anaReal)) === true && (await aviso(anaWee, betoReal)) === true);
  check('ni bloquear ni desbloquear tocan nada fuera de sus tres colecciones: ni conversaciones, ni mensajes, ni avisos, ni reportes',
    JSON.stringify(coleccionesDe(base)) === JSON.stringify([B.CUPOS, 'users'].sort()), coleccionesDe(base).join(', '));

  /* Una cara bloqueada cuyo perfil ya no existe se puede seguir desbloqueando. */
  await motor.bloquear({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: betoWee });
  base.docs.delete(`users/${betoWee}`);
  const huerfana = await motor.desbloquear({ cuentaDeLaSesion: ana, identidad: betoWee });
  check('desbloquear no necesita resolver la otra cuenta: si su perfil ya no existe, se desbloquea igual', huerfana.estaba === true && indiceDe(base).length === 0);

  const errores = async (args, fn = 'bloquear') => {
    const e = await rechaza(motor[fn](args));
    return e instanceof B.BloqueoError ? e.motivo : e ? `otro: ${e.message}` : 'sin error';
  };
  const { motor: m2, base: b2 } = nuevoMundo();
  const err = async (args) => { const e = await rechaza(m2.bloquear(args)); return e instanceof B.BloqueoError ? e.motivo : String(e && e.message); };
  check('bloquearse a uno mismo (la otra cara propia) es «misma-persona»', (await err({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: anaWee })) === 'misma-persona');
  check('actuar con una cara de otra cuenta es «identidad-ajena»', (await err({ cuentaDeLaSesion: ana, comoIdentidad: betoReal, identidad: carlaReal })) === 'identidad-ajena');
  check('una cara que no existe en `users` es «identidad-desconocida»', (await err({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: 'nadieCuentaW0' })) === 'identidad-desconocida');
  check('lo que no tiene forma de identidad es «identidad-invalida»', (await err({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: 'a/b' })) === 'identidad-invalida'
    && (await err({ cuentaDeLaSesion: ana, comoIdentidad: 7, identidad: betoWee })) === 'identidad-invalida');
  check('una sesión sin forma de cuenta no hace nada', (await err({ cuentaDeLaSesion: 'hidi_x', comoIdentidad: 'hidi_x', identidad: betoWee })) === 'identidad-ajena');
  b2.docs.set(`${B.CUPOS}/${ana}`, { relaciones: B.MAX_CUENTAS_BLOQUEADAS });
  check(`pasado el tope (${B.MAX_CUENTAS_BLOQUEADAS} cuentas), una cuenta NUEVA no se bloquea: «demasiados»`, (await err({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: betoWee })) === 'demasiados' && b2.de(B.BLOQUEOS).length === 0);
  b2.docs.set(`${B.CUPOS}/${ana}`, { relaciones: 0 });
  await m2.bloquear({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: betoWee });
  b2.docs.set(`${B.CUPOS}/${ana}`, { relaciones: B.MAX_CUENTAS_BLOQUEADAS });
  const masDeLaMisma = await m2.bloquear({ cuentaDeLaSesion: ana, comoIdentidad: anaWee, identidad: betoReal });
  check('pero otra cara de una cuenta YA bloqueada sí entra (no es una cuenta nueva)', masDeLaMisma.bloqueado === true && b2.leer(`${B.BLOQUEOS}/${ana}~${beto}`).entradas.length === 2);
  check('desbloquear con una identidad sin forma es «identidad-invalida»', (await errores({ cuentaDeLaSesion: ana, identidad: '' }, 'desbloquear')) === 'identidad-invalida');
  const sesion = (proveedor) => ({ uid: ana, token: { firebase: { sign_in_provider: proveedor } } });
  const codigoDe = (fn) => { try { fn(); return 'ok'; } catch (e) { return `${e.code}:${e.message}`; } };
  check('las callables piden una cuenta con sesión de verdad: sin sesión no, el invitado tampoco (ACCOUNT_REQUIRED), con credencial sí',
    /unauthenticated/.test(codigoDe(() => B.cuentaDeLaLlamada(undefined)))
    && codigoDe(() => B.cuentaDeLaLlamada(sesion('anonymous'))).endsWith(':ACCOUNT_REQUIRED')
    && B.cuentaDeLaLlamada(sesion('password')) === ana && B.cuentaDeLaLlamada(sesion('google.com')) === ana);
}

console.log('\n── E · Privacidad: la lista, y lo que nadie más puede saber ──');
{
  const { base, motor } = nuevoMundo();
  await motor.bloquear({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: betoWee });
  const deAna = (await motor.listar({ cuentaDeLaSesion: ana })).bloqueados;
  check('Ana ve en su lista la cara que bloqueó, desde qué cara suya y desde cuándo', deAna.length === 1 && deAna[0].identidad === betoWee
    && JSON.stringify(deAna[0].desdeIdentidades) === JSON.stringify([anaReal]) && typeof deAna[0].desde === 'number', JSON.stringify(deAna));
  const texto = JSON.stringify(deAna);
  check('la lista NO dice la cuenta de Beto ni su otra cara (su Perfil Real), ni tiene ningún campo de cuenta',
    !texto.includes(`"${beto}"`) && !texto.includes(`"${betoReal}"`) && !deAna.some((fila) => Object.keys(fila).some((k) => /cuenta/i.test(k))));
  check('Beto no tiene lista que le diga que está bloqueado: la suya está vacía', (await motor.listar({ cuentaDeLaSesion: beto })).bloqueados.length === 0);
  check('y nadie más ve la de Ana: cada cuenta solo pide la suya (Carla, vacía)', (await motor.listar({ cuentaDeLaSesion: carla })).bloqueados.length === 0);
  check('bloquear no avisa a nadie: no escribe avisos, ni mensajes, ni reportes', !coleccionesDe(base).some((c) => ['notifications', 'conversations', 'reports', 'moderationLimits', 'pushLimits'].includes(c)));
  const r = await motor.bloquear({ cuentaDeLaSesion: ana, comoIdentidad: anaWee, identidad: betoReal });
  check('si Ana bloquea también la otra cara de Beto (sin saber que es él), la respuesta no lo delata: «no estaba»', r.yaEstaba === false && r.identidad === betoReal);
  const dos = (await motor.listar({ cuentaDeLaSesion: ana })).bloqueados;
  check('y su lista las enseña como DOS filas: juntarlas le diría que son la misma persona', dos.length === 2 && new Set(dos.map((x) => x.identidad)).size === 2);
  check('las respuestas del motor no llevan ninguna cuenta: bloquear, desbloquear y listar',
    ['identidad', 'bloqueado', 'yaEstaba'].join() === Object.keys(r).join() && ['bloqueados'].join() === Object.keys(await motor.listar({ cuentaDeLaSesion: ana })).join()
    && ['identidad', 'bloqueado', 'estaba'].join() === Object.keys(await motor.desbloquear({ cuentaDeLaSesion: ana, identidad: betoReal })).join());
  const una = (await motor.listar({ cuentaDeLaSesion: ana })).bloqueados;
  check('quitar una de esas dos filas deja la otra, y la cuenta de Beto sigue bloqueada: quitar una no abre a esa persona',
    una.length === 1 && una[0].identidad === betoWee && (await motor.permiteAviso(conCuenta(betoReal), conCuenta(anaWee))) === false);
  const reglas = leer('firestore.rules');
  check('las cuatro colecciones son SOLO del servidor: firestore.rules no las nombra y no hay comodín que las abra',
    ![B.BLOQUEOS, B.PARES, B.CUPOS, I.INTENTOS_BLOQUEADOS].some((c) => reglas.includes(c)) && !/match \/\{document=\*\*\}/.test(reglas));
}

console.log('\n── F · Sin inspección: la lógica del bloqueo no lee mensajes ni toca la moderación ──');
{
  const fuente = leer('functions/src/social/weetalkBloqueos.ts');
  const codigo = sinComentarios(fuente);
  check('no nombra mensajes, conversaciones ni su contenido', !/['"`](messages|conversations)['"`]|\.content\b|imageUrl|audioUrl|fileUrl|lastMessage|\btext\b/.test(codigo));
  check('no importa ni escribe nada de la moderación, de los avisos ni de Credits', !/moderation|reports|notifications|reportContent|credits|creditEngine|spendCredits/i.test(codigo));
  check('no deduce la cuenta de una cara quitando un prefijo: ni lo escribe ni lo recorta',
    !/hidi_|\.replace\(|\.slice\(|\.substring\(|\.substr\(|startsWith\(/.test(codigo) && /identidadesHeredadasDeLaCuenta/.test(codigo) && /cuentaDeIdentidad\(/.test(codigo));
  check('las caras de una cuenta salen de la frontera de compatibilidad y la cuenta se LEE de `users` por el campo uid',
    /carasDe: identidadesHeredadasDeLaCuenta/.test(codigo) && /where\('uid', '==', identidad\)\.limit\(5\)/.test(codigo));
  check('las consultas van acotadas', (codigo.match(/\.where\(/g) || []).length === (codigo.match(/\.where\([^)]*\)\.limit\(/g) || []).length);
  check('sin IA, sin proveedores, sin secretos', !/engine\/(router|gateway|providers)|defineSecret|secrets:|fetch\(/.test(codigo));
  check('de ËContact solo BORRA: lee las relaciones posibles por su id y borra las pendientes y las aceptadas entre las dos cuentas; nunca crea, acepta ni modifica una',
    /tx\.delete\(s\.ref\)/.test(codigo) && /esRelacionDeEContactEntre\(s\.datos, misCaras, susCaras\)/.test(codigo) && !/tx\.(create|update)\(/.test(codigo)
    && JSON.stringify(B.ESTADOS_QUE_BORRA_EL_BLOQUEO) === JSON.stringify(['pending', 'accepted']));
  check('el bloqueo no toca nada social de la App: ni «me gusta», ni comentarios, ni publicaciones, ni seguimientos',
    !/['"`](likes|comments|posts|follows|reposts|bookmarks)['"`]/.test(codigo));
}

console.log('\n── G · El cableado ──');
{
  const indice = sinComentarios(leer('functions/src/index.ts'));
  const disparador = indice.slice(indice.indexOf('export const sendMessagePushNotification'));
  const iPermite = disparador.indexOf('bloqueosEngine.permiteAviso(');
  check('el push de mensajes pregunta a la regla común ANTES de buscar el teléfono y de enviar',
    iPermite > 0 && iPermite < disparador.indexOf('destinoDelPush(cuenta)') && iPermite < disparador.indexOf('sendExpoPush('));
  const llamada = disparador.slice(iPermite, disparador.indexOf(')))', iPermite));
  check('y le pasa quién y a quién, nunca el mensaje', /identidad: senderId, cuenta: cuentaQueEscribe/.test(llamada) && /identidad: participantId, cuenta/.test(llamada) && !/content/.test(llamada));
  check('la cuenta de quien escribe sale del perfil ya leído con el resolutor canónico',
    /const cuentaQueEscribe = senderDoc \? cuentaDeIdentidad\(senderId, senderDoc\.data\(\) as PerfilDeIdentidad\) : null;/.test(disparador));
  check('y si no puede sonar, se salta a ese destinatario sin enviar', /permiteAviso\([^;]*\)\)\) \{\s*console\.log\([^)]*\);\s*continue;/.test(disparador));
  const avisos = indice.slice(indice.indexOf('export const sendPushNotification'), indice.indexOf('export const sendMessagePushNotification'));
  const iAviso = avisos.indexOf('bloqueosEngine.permiteAviso(');
  check('el push de los avisos pregunta a la regla común solo para los de ËContact, ANTES de gastar el cupo y de enviar',
    /if \(esAvisoDeEContact\(type\)\s*&& !\(await bloqueosEngine\.permiteAviso\(\{ identidad: senderId, cuenta: cuentaQueAvisa \}, \{ identidad: recipientId, cuenta \}\)\)\) \{\s*console\.log\([^)]*\);\s*return null;/.test(avisos)
    && iAviso > avisos.indexOf('const cuentaQueAvisa = await cuentaDeLaIdentidad(senderId);')
    && iAviso < avisos.indexOf('gastarCupoDeAvisos(cuentaQueAvisa)') && iAviso < avisos.indexOf('sendExpoPush('));
  check('los avisos de ËContact son exactamente pedir y aceptar; «me gusta», comentarios y lo demás, no',
    JSON.stringify(B.TIPOS_DE_AVISO_DE_ECONTACT) === JSON.stringify(['econtact_request', 'econtact_accepted'])
    && B.esAvisoDeEContact('econtact_request') && B.esAvisoDeEContact('econtact_accepted')
    && !['like', 'comment', 'message', 'follow', undefined, null, 7].some((t) => B.esAvisoDeEContact(t)));
  const ec = sinComentarios(leer('functions/src/social/econtact.ts'));
  check('el límite de intentos va dentro de las mismas dos transacciones, por la cuenta, con el cupo de los avisos y el rechazo fuera',
    /leerIntentos\(tx, db, de\.accountUid, 'pedir', para\.accountUid, bloqueo\.exists\)/.test(ec)
    && /leerIntentos\(tx, db, yo\.accountUid, 'aceptar', otro\.accountUid, bloqueo\.exists\)/.test(ec)
    && /cupoDeAvisos\(guardado\.exists \? guardado\.data\(\) : null, ahora, LIMITE_DE_INTENTOS_BLOQUEADOS\)/.test(ec)
    && (ec.match(/if \(resultado\.rechazo\) throw new EContactError\(resultado\.rechazo\);/g) || []).length === 2);
  check('ËContact consulta el índice DENTRO de sus dos transacciones (pedir y aceptar), sin abrir otra',
    (ec.match(/await tx\.get\(db\.collection\(PARES_BLOQUEADOS\)\.doc\(claveDePar\(/g) || []).length === 2
    && /decidirSolicitud\(\{ de, para, existente, bloqueo: bloqueo\.exists \}\)/.test(ec)
    && /decidirAceptacion\(\{ doc, yo: yo\.identity, otro: otro\.identity, bloqueo: bloqueo\.exists \}\)/.test(ec)
    && (ec.match(/runTransaction/g) || []).length === 2 && /from '\.\/bloqueosIndice'/.test(ec) && !/weetalkBloqueos/.test(ec));
  check('index.ts exporta las tres callables desde su módulo, en una línea',
    /export \{ blockWeeTalkContact, unblockWeeTalkContact, listWeeTalkBlocks \} from '\.\/social\/weetalkBloqueos';/.test(indice));
  const compilado = require(path.join(RAIZ, 'functions/lib/index.js'));
  check('el compilado las expone como callables', ['blockWeeTalkContact', 'unblockWeeTalkContact', 'listWeeTalkBlocks'].every((f) => compilado[f] && compilado[f].__endpoint && compilado[f].__endpoint.callableTrigger));
  const grupos = JSON.parse(leer('ops/despliegue/grupos.json'));
  check('no se despliegan: están en «no_se_despliegan» con su porqué, y en ningún grupo',
    ['blockWeeTalkContact', 'unblockWeeTalkContact', 'listWeeTalkBlocks'].every((f) => grupos.no_se_despliegan.some((x) => x.funcion === f && x.porque.length > 80)
      && !grupos.grupos.some((g) => g.funciones.includes(f))));
  const pkg = JSON.parse(leer('functions/package.json'));
  check('esta suite está en la cadena de `npm test`', /node test\/weetalk-bloqueo\.test\.mjs/.test(pkg.scripts.test));
  const dominios = JSON.parse(leer('ops/guardian/dominios.json'));
  check('y la vigila el dominio de WeeTalk (social-y-feed), junto a las otras suites de WeeTalk',
    dominios.dominios.some((d) => d.id === 'social-y-feed' && d.suites.includes('weetalk-bloqueo') && d.suites.includes('weetalk-view-once')));
  const cliente = leer('services/weetalkBloqueosService.ts');
  check('el servicio del cliente llama a las tres callables por su nombre y no escribe en Firestore',
    ["'blockWeeTalkContact'", "'unblockWeeTalkContact'", "'listWeeTalkBlocks'"].every((x) => cliente.includes(x)) && !/firebase\/firestore|addDoc|setDoc|updateDoc/.test(cliente));
  check('y no tiene textos de interfaz: los errores viajan como código', !/notify\(|Alert\.|t\('/.test(sinComentarios(cliente)) && /motivoDeBloqueo/.test(cliente));
}

console.log('\n── H · La propuesta de reglas: compone, cubre los caminos del cliente y NO está aplicada ──');
{
  const reglas = leer('firestore.rules');
  const propuesta = fs.readFileSync(P.RUTA_DE_LA_PROPUESTA, 'utf8');
  const propuestaDeAvisos = fs.readFileSync(P.RUTA_DE_LA_PROPUESTA_DE_AVISOS, 'utf8');
  let compuesta = null;
  let motivo = '';
  try { compuesta = P.componerPropuesta(reglas, propuesta, propuestaDeAvisos); } catch (e) { motivo = e.message; }
  check('compone sobre las reglas de hoy (los bloques de conversaciones y de avisos siguen siendo los de W0)', !!compuesta, motivo);
  const actual = P.bloqueDeConversaciones(reglas);
  const actualAvisos = P.bloqueDeAvisos(reglas);
  const nueva = compuesta ? P.bloqueDeConversaciones(compuesta) : null;
  const nuevaAvisos = compuesta ? P.bloqueDeAvisos(compuesta) : null;
  const tramos = (b1, b2) => [b1.texto.slice(0, b1.inicio), b1.texto.slice(b1.fin, b2.inicio), b2.texto.slice(b2.fin)];
  check('fuera de esos dos bloques, las reglas compuestas son idénticas byte a byte (y con los mismos finales de línea)',
    !!nueva && !!nuevaAvisos && actual.inicio < actualAvisos.inicio
    && JSON.stringify(tramos(nueva, nuevaAvisos)) === JSON.stringify(tramos(actual, actualAvisos))
    && compuesta.includes('\r\n') === reglas.includes('\r\n'));
  const b = nueva ? nueva.bloque : '';
  check('las conversaciones preguntan al índice del servidor con la misma clave', b.includes(`exists(/databases/$(database)/documents/${P.COLECCION_DEL_INDICE}/$(de + '~' + para))`));
  check('cubre los tres caminos que escribe el cliente en WeeTalk: crear conversación, actualizarla y crear un mensaje',
    /allow create:[\s\S]*?!chatBloqueadoPara\(request\.resource\.data\.participants\);/.test(b)
    && /allow update:[\s\S]*?\(!chatBloqueadoPara\(resource\.data\.participants\) \|\| cambioPermitidoConBloqueo\(\)\);/.test(b)
    && /match \/messages\/\{messageId\}[\s\S]*allow create:[\s\S]*?!bloqueado\(request\.resource\.data\.senderId, laOtraEn\(participantesDelChat\(\), request\.resource\.data\.senderId\)\);/.test(b));
  check('y no cambia quién LEE: el historial sigue siendo de los dos participantes',
    b.slice(b.indexOf('allow read:'), b.indexOf(';', b.indexOf('allow read:'))) === actual.bloque.slice(actual.bloque.indexOf('allow read:'), actual.bloque.indexOf(';', actual.bloque.indexOf('allow read:'))));
  const ba = nuevaAvisos ? nuevaAvisos.bloque : '';
  check('los avisos de ËContact (pedir y aceptar) entre cuentas con un bloqueo no se crean, con la misma clave del índice',
    /allow create: if isAuthenticated\(\) &&[\s\S]*?avisoConLaFormaDeLaApp\(\) &&\s*!avisoDeEContactBloqueado\(\);/.test(ba)
    && ba.includes("request.resource.data.type in ['econtact_request', 'econtact_accepted'] &&")
    && ba.includes(`exists(/databases/$(database)/documents/${P.COLECCION_DEL_INDICE}/$(request.resource.data.senderId + '~' + request.resource.data.recipientId))`));
  const sinLoNuevo = (txt) => {
    const lf = txt.replace(/\r\n/g, '\n');
    const i = lf.indexOf('      // ── BLOQUEO DE CONTACTOS');
    const f = lf.indexOf('      allow create: if isAuthenticated() &&', i);
    return (i < 0 || f < 0 ? lf : lf.slice(0, i) + lf.slice(f))
      .replace('avisoConLaFormaDeLaApp() &&\n        !avisoDeEContactBloqueado();', 'avisoConLaFormaDeLaApp();');
  };
  check('el bloque de avisos propuesto es el de W0 con UNA función y UNA condición más, y nada más cambia (ni quién lee)',
    !!nuevaAvisos && sinLoNuevo(ba) === actualAvisos.bloque && ba !== actualAvisos.bloque);
  check('la propuesta NO está aplicada: firestore.rules no conoce el índice (aplicarla exige la autorización del dueño y actualizar esta comprobación)',
    !reglas.includes(P.COLECCION_DEL_INDICE) && P.huellaDe(actual.bloque) === P.HUELLA_DEL_BLOQUE_DE_W0 && P.huellaDe(actualAvisos.bloque) === P.HUELLA_DEL_BLOQUE_DE_AVISOS_DE_W0);
  const seNiega = (alteradas) => { try { P.componerPropuesta(alteradas, propuesta, propuestaDeAvisos); return false; } catch { return true; } };
  check('si el bloque de conversaciones cambia, la propuesta se niega a componer (hay que revisarla)',
    seNiega(reglas.replace('allow delete: if false;\n\n      // Mensajes', 'allow delete: if false;\n\n      // Mensajes (cambiado)')));
  check('y si cambia el de avisos, también', seNiega(reglas.replace("return ['like', 'comment', 'econtact_request', 'econtact_accepted'];", "return ['like', 'comment', 'econtact_request', 'econtact_accepted', 'otro'];")));
  const prueba = leer('ops/propuestas/weetalk-bloqueo/reglas.prueba.mjs');
  const corredor = await import(pathToFileURL(path.join(RAIZ, 'ops/propuestas/weetalk-bloqueo/correr-reglas.mjs')).href);
  check('las pruebas de reglas están preparadas fuera de la CI (no son `*.emulator.mjs`), con los avisos y con su sabotaje',
    !fs.readdirSync(aqui).some((f) => /bloqueo/i.test(f) && f.endsWith('.emulator.mjs')) && /Sabotaje/.test(prueba) && /componerPropuesta\(reglasActuales\)/.test(prueba)
    && /econtact_request/.test(prueba));
  const cfg = corredor.configuracionAislada('firestore.rules');
  check('y se lanzan en un emulador aislado: demo-wee-bloqueo, puertos propios, ninguno de la demo viva, sin interfaz',
    corredor.puertosEnConflicto(cfg).length === 0 && cfg.emulators.firestore.port === 38080 && cfg.emulators.firestore.websocketPort === 39150
    && cfg.emulators.auth.port === 39099 && cfg.emulators.functions.port === 35001 && cfg.emulators.storage.port === 39199
    && cfg.emulators.hub.port === 34400 && cfg.emulators.logging.port === 34500 && cfg.emulators.ui.enabled === false
    && /const PROYECTO = 'demo-wee-bloqueo';/.test(leer('ops/propuestas/weetalk-bloqueo/correr-reglas.mjs'))
    && corredor.puertosEnConflicto({ emulators: { firestore: { port: 8080 } } }).join() === '8080');
}

console.log('\n── I · Sabotaje: con la regla rota a propósito, las comprobaciones fallan ──');
{
  const relAB = relacion(ana, beto, [[anaReal, betoWee]]);
  const contra = (motor) => cruzadas.filter(([de, para]) => decide(motor, relAB, null, de, para).puede === E.PROHIBIDO_EN_EL_ESCENARIO.has(`${de}~${para}`)).length;
  /* «Solo la cara que se vio»: Beto escaparía cambiando de cara. */
  const soloLaCara = (a) => (a.bloqueoDelDestino?.entradas.some((e) => e.caraQueBloquea === a.para.identidad && e.caraBloqueada === a.de.identidad) ? { puede: false } : { puede: true });
  /* La regla ANTERIOR a la decisión del dueño: por caras, dejando abiertas la otra cara de Ana y la otra de Beto. */
  const porCaras = (a) => {
    if (a.de.cuenta === a.para.cuenta) return { puede: true };
    if (a.bloqueoDelDestino?.entradas.some((e) => e.caraQueBloquea === a.para.identidad)) return { puede: false };
    if (a.bloqueoPropio?.entradas.some((e) => e.caraBloqueada === a.para.identidad)) return { puede: false };
    return { puede: true };
  };
  /* «Solo un sentido»: Beto no le llega a Ana, pero Ana sí a Beto (su respuesta fallaría y delataría la cara de Ana). */
  const unSentido = (a) => (a.de.cuenta !== a.para.cuenta && a.bloqueoDelDestino?.entradas.length ? { puede: false } : { puede: true });
  check('una regla que solo bloquea la cara que se vio deja escapar a Beto: la especificación lo detecta', contra(soloLaCara) > 0, `${contra(soloLaCara)} casos`);
  check('la regla anterior, por caras, deja abiertas las otras caras: la especificación lo detecta', contra(porCaras) > 0, `${contra(porCaras)} casos`);
  check('una regla de un solo sentido deja a Ana escribir a Beto: la especificación lo detecta', contra(unSentido) > 0, `${contra(unSentido)} casos`);
  check('y la de verdad, ninguno', contra(B.puedeEscribir) === 0);
}

console.log('\n── J · ËContact: pedir y aceptar se niegan, solicitudes y conexiones se borran y desbloquear no restaura nada ──');
{
  const id = EC.idDeContacto;
  /* El motor real de ËContact sobre la misma base en memoria; su `tx.create` falla si ya existe, como en Firestore. */
  const conCreate = (base) => ({
    collection: (p) => base.collection(p),
    runTransaction: (fn) => base.runTransaction((tx) => {
      tx.create = (ref, datos) => { if (base.leer(ref.path)) throw new Error(`ya existe ${ref.path}`); return tx.set(ref, datos); };
      return fn(tx);
    }),
  });
  const mundo = () => {
    const m = nuevoMundo();
    return { ...m, ec: EC.createEContactEngine({ db: () => conCreate(m.base), ahora: () => 1, sello: (ms) => ms }) };
  };
  const pedir = (ec, cuentaDeLaSesion, de, para) => ec.request({ cuentaDeLaSesion, desdeIdentidad: de, haciaIdentidad: para });
  const motivoDe = async (promesa) => { const e = await rechaza(promesa); return e instanceof EC.EContactError ? e.motivo : e ? `otro: ${e.message}` : 'sin error'; };

  const { base, motor, ec } = mundo();
  const s1 = await pedir(ec, beto, betoWee, anaReal);
  const s2 = await pedir(ec, ana, anaWee, betoReal);
  const s3 = await pedir(ec, carla, carlaReal, anaReal);
  /* Conexiones ya aceptadas: una entre Ana y Beto (por sus caras Real) y otra entre Ana (Weë) y Carla. */
  base.docs.set(`econtacts/${id(anaReal, betoReal)}`, { users: [anaReal, betoReal].sort(), status: 'accepted', requestedBy: anaReal, requestedTo: betoReal });
  base.docs.set(`econtacts/${id(anaWee, carlaReal)}`, { users: [anaWee, carlaReal].sort(), status: 'accepted', requestedBy: carlaReal, requestedTo: anaWee });
  check('sin bloqueo, ËContact funciona como siempre: se piden solicitudes en los dos sentidos', s1.status === 'pending' && s2.status === 'pending' && s3.status === 'pending');
  const r = await motor.bloquear({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: betoWee });
  check('al bloquear se CANCELAN las solicitudes pendientes entre las dos cuentas, en los dos sentidos y entre cualesquiera caras',
    !base.leer(`econtacts/${s1.contactId}`) && !base.leer(`econtacts/${s2.contactId}`));
  check('y se ELIMINAN las conexiones ya aceptadas entre las dos cuentas, aunque sean de otras caras que las del bloqueo',
    !base.leer(`econtacts/${id(anaReal, betoReal)}`));
  check('lo de otras personas no se toca: ni la solicitud de Carla ni su conexión con Ana',
    base.leer(`econtacts/${s3.contactId}`)?.status === 'pending' && base.leer(`econtacts/${id(anaWee, carlaReal)}`)?.status === 'accepted');
  check('la respuesta de bloquear no dice cuántas solicitudes ni conexiones había: lo delataría', JSON.stringify(Object.keys(r)) === JSON.stringify(['identidad', 'bloqueado', 'yaEstaba']));
  const desdeBeto = await Promise.all([[betoWee, anaReal], [betoReal, anaWee], [betoWee, anaWee]].map(([de, para]) => motivoDe(pedir(ec, beto, de, para))));
  const desdeAna = await Promise.all([[anaWee, betoWee], [anaReal, betoWee]].map(([de, para]) => motivoDe(pedir(ec, ana, de, para))));
  check('con el bloqueo, Beto no pide ËContact a ninguna cara de Ana, desde ninguna de las suyas', desdeBeto.every((m) => m === 'relacion-invalida'), desdeBeto.join(', '));
  check('y Ana tampoco a Beto, mientras no desbloquee', desdeAna.every((m) => m === 'relacion-invalida'), desdeAna.join(', '));
  const e = await rechaza(pedir(ec, beto, betoReal, anaWee));
  check('el error es el genérico de siempre («no válida»): no dice que hay un bloqueo ni de quién es ninguna cara',
    e instanceof EC.EContactError && e.message === EC.MENSAJES['relacion-invalida'] && !/bloque/i.test(e.message));
  check('Carla, que no tiene nada que ver, sigue pidiendo ËContact a Beto: el bloqueo es solo entre las cuentas de Ana y Beto',
    (await pedir(ec, carla, carlaReal, betoWee)).status === 'pending');
  check('bloquear no deja rastro en ËContact: ni avisos, ni reportes, ni documentos nuevos', !coleccionesDe(base).some((c) => ['notifications', 'reports'].includes(c)));

  await motor.desbloquear({ cuentaDeLaSesion: ana, identidad: betoWee });
  check('desbloquear NO restaura las solicitudes canceladas ni las conexiones eliminadas',
    !base.leer(`econtacts/${s1.contactId}`) && !base.leer(`econtacts/${s2.contactId}`) && !base.leer(`econtacts/${id(anaReal, betoReal)}`));
  const sinSolicitud = await motivoDe(ec.accept({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, otraIdentidad: betoReal }));
  check('nada que aceptar sin una solicitud nueva: la conexión anterior no vuelve sola («sin-relacion»)', sinSolicitud === 'sin-relacion', sinSolicitud);
  const otra = await pedir(ec, beto, betoWee, anaReal);
  check('desde ahí, las reglas normales: Beto puede volver a pedir, como una solicitud nueva', otra.status === 'pending' && base.leer(`econtacts/${otra.contactId}`)?.status === 'pending');
  const aceptada = await ec.accept({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, otraIdentidad: betoWee });
  check('y para reconectar, Ana la acepta: solicitud nueva + aceptación = conexión nueva', aceptada.status === 'accepted' && base.leer(`econtacts/${otra.contactId}`)?.status === 'accepted');

  /* Una solicitud que se cruzó con el bloqueo (sembrada después, como si hubiera llegado a la vez) queda inutilizada. */
  const { base: b2, motor: m2, ec: ec2 } = mundo();
  await m2.bloquear({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: betoWee });
  b2.docs.set(`econtacts/${id(anaWee, betoReal)}`, { users: [anaWee, betoReal].sort(), status: 'pending', requestedBy: betoReal, requestedTo: anaWee });
  const aceptar = await motivoDe(ec2.accept({ cuentaDeLaSesion: ana, comoIdentidad: anaWee, otraIdentidad: betoReal }));
  check('una solicitud que siguiera en pie entre las dos cuentas no se acepta mientras dure el bloqueo (genérico, sin tocarla)',
    aceptar === 'relacion-invalida' && b2.leer(`econtacts/${id(anaWee, betoReal)}`)?.status === 'pending', aceptar);

  const resuelta = (identity, accountUid) => ({ identity, accountUid, type: identity.startsWith('hidi_') ? 'wee' : 'real' });
  const de = resuelta(betoWee, beto);
  const para = resuelta(anaReal, ana);
  check('la decisión pura: el bloqueo va el ÚLTIMO, así que lo que ya se rechazaba se rechaza igual',
    EC.decidirSolicitud({ de, para, existente: null, bloqueo: true }).motivo === 'relacion-invalida'
    && EC.decidirSolicitud({ de, para, existente: { status: 'pending' }, bloqueo: true }).motivo === 'ya-existe'
    && EC.decidirSolicitud({ de, para: resuelta(betoReal, beto), existente: null, bloqueo: true }).motivo === 'misma-persona'
    && EC.decidirSolicitud({ de, para, existente: null }).ok === true && EC.decidirSolicitud({ de, para, existente: null, bloqueo: false }).ok === true);
}

console.log('\n── K · Límite contra intentos reiterados de contactar a quien te bloqueó ──');
{
  const id = EC.idDeContacto;
  let reloj = 50_000_000;
  const conCreate = (base) => ({
    collection: (p) => base.collection(p),
    runTransaction: (fn) => base.runTransaction((tx) => {
      tx.create = (ref, datos) => { if (base.leer(ref.path)) throw new Error(`ya existe ${ref.path}`); return tx.set(ref, datos); };
      return fn(tx);
    }),
  });
  const { base, motor } = nuevoMundo();
  const ec = EC.createEContactEngine({ db: () => conCreate(base), ahora: () => reloj, sello: (ms) => ms });
  const pedir = (cuenta, de, para) => ec.request({ cuentaDeLaSesion: cuenta, desdeIdentidad: de, haciaIdentidad: para });
  const error = async (p) => { const e = await rechaza(p); return e instanceof EC.EContactError ? e : null; };
  const intentosDe = (clave) => base.leer(`${I.INTENTOS_BLOQUEADOS}/${clave}`);
  const { maximo, ventanaMs } = I.LIMITE_DE_INTENTOS_BLOQUEADOS;
  const usuariosAntes = JSON.stringify(base.de('users'));

  check(`el límite es por cuenta y operación, con la ventana fija de los avisos: ${maximo} intentos bloqueados por ${ventanaMs / 60000} min (decisión del dueño, 2026-11-07)`,
    maximo === 5 && ventanaMs === 3_600_000 && I.claveDeIntentos(beto, 'pedir') === `${beto}~pedir` && I.claveDeIntentos(beto, 'aceptar') === `${beto}~aceptar`);
  check('el rechazo del bloqueo y el del límite son EL MISMO objeto genérico (relacion-invalida)',
    EC.RECHAZO_GENERICO.ok === false && EC.RECHAZO_GENERICO.motivo === 'relacion-invalida'
    && EC.decidirSolicitud({ de: { identity: betoWee, accountUid: beto, type: 'wee' }, para: { identity: anaReal, accountUid: ana, type: 'real' }, existente: null, bloqueo: true }) === EC.RECHAZO_GENERICO);

  await motor.bloquear({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: betoWee });
  const intentos = [[betoWee, anaReal], [betoReal, anaWee], [betoWee, anaWee], [betoReal, anaReal], [betoWee, anaReal]];
  const errores = [];
  for (const [de, para] of intentos) errores.push(await error(pedir(beto, de, para)));
  check(`Beto intenta ${maximo} veces contactar a Ana, que lo bloqueó, cambiando de cara: las ${maximo} reciben el rechazo genérico`,
    errores.length === maximo && errores.every((e) => e && e.motivo === 'relacion-invalida'), errores.map((e) => e && e.motivo).join(','));
  check('cuentan para su CUENTA, no para cada cara: un solo contador con los cinco, ninguno por su cara Weë',
    intentosDe(I.claveDeIntentos(beto, 'pedir'))?.usados === maximo && !intentosDe(I.claveDeIntentos(betoWee, 'pedir')));
  const antesDelSexto = intentosDe(I.claveDeIntentos(beto, 'pedir'));
  reloj += 1;
  const sexto = await error(pedir(beto, betoWee, anaWee));
  check('el SEXTO intento dentro de la ventana recibe el mismo rechazo genérico (mismo motivo y mensaje que el bloqueo)',
    sexto?.motivo === 'relacion-invalida' && !!errores[0] && sexto.message === errores[0].message && sexto.message === EC.MENSAJES['relacion-invalida']);
  check('y agotado el cupo ya no se escribe nada: el contador sigue en 5, con la misma hora (nadie puede inflarlo)',
    JSON.stringify(intentosDe(I.claveDeIntentos(beto, 'pedir'))) === JSON.stringify(antesDelSexto) && antesDelSexto?.usados === maximo);
  const aCarla = await pedir(beto, betoReal, carlaReal).catch((e) => ({ status: `rechazada: ${e?.motivo || e?.message}` }));
  check('con el cupo agotado, su solicitud a Carla (que NO lo bloqueó) funciona: el límite no frena a nadie más',
    aCarla.status === 'pending' && base.leer(`econtacts/${id(betoReal, carlaReal)}`)?.status === 'pending', String(aCarla.status));
  check('las conversaciones y los mensajes no pasan por el límite: ni messagesService ni firestore.rules nombran el contador',
    !leer('services/messagesService.ts').includes('weetalkIntentosBloqueados') && !leer('firestore.rules').includes(I.INTENTOS_BLOQUEADOS));
  base.docs.delete(`econtacts/${id(betoReal, carlaReal)}`);

  const deAna = await error(pedir(ana, anaWee, betoReal));
  check('los intentos de quien BLOQUEÓ no cuentan: Ana intenta escribir a Beto, se le rechaza, y su contador ni existe',
    deAna?.motivo === 'relacion-invalida' && !intentosDe(I.claveDeIntentos(ana, 'pedir')));
  check('un tercero no puede gastar el cupo de nadie: Ana (el destino) no queda limitada y pide a Carla con normalidad',
    (await pedir(ana, anaReal, carlaReal)).status === 'pending' && !intentosDe(I.claveDeIntentos(ana, 'pedir')));
  check('Carla, ajena a todo, tampoco: pide a Ana sin límite alguno', (await pedir(carla, carlaReal, anaWee)).status === 'pending' && !intentosDe(I.claveDeIntentos(carla, 'pedir')));

  /* «aceptar» tiene su propio contador: una solicitud de Ana que se cruzó con el bloqueo y que Beto intenta aceptar. */
  base.docs.set(`econtacts/${id(anaWee, betoWee)}`, { users: [anaWee, betoWee].sort(), status: 'pending', requestedBy: anaWee, requestedTo: betoWee });
  const aceptar = await error(ec.accept({ cuentaDeLaSesion: beto, comoIdentidad: betoWee, otraIdentidad: anaWee }));
  check('aceptar cuenta aparte: rechazo genérico y un intento en «aceptar», sin tocar el de «pedir»',
    aceptar?.motivo === 'relacion-invalida' && intentosDe(I.claveDeIntentos(beto, 'aceptar'))?.usados === 1 && intentosDe(I.claveDeIntentos(beto, 'pedir'))?.usados === maximo);

  check('no suspende ni marca a nadie: los perfiles de users quedan igual y no hay reportes, casos ni avisos',
    JSON.stringify(base.de('users')) === usuariosAntes && !coleccionesDe(base).some((c) => /report|moderation|caso|sancion|notifications|suspend/i.test(c)));

  reloj += ventanaMs + 1;
  const tras = await pedir(beto, betoReal, carlaReal);
  check('pasada la ventana, Beto sigue pidiendo a Carla con normalidad', tras.status === 'pending');
  base.docs.delete(`econtacts/${id(betoReal, carlaReal)}`);
  check('un rechazo corriente (Carla borra la solicitud) no cuenta: el contador no cambia', intentosDe(I.claveDeIntentos(beto, 'pedir'))?.usados === maximo);
  await error(pedir(beto, betoWee, anaReal));
  const nuevo = intentosDe(I.claveDeIntentos(beto, 'pedir'));
  check('el límite se recupera al salir de la ventana: el siguiente intento bloqueado abre una ventana nueva desde cero (1, empezando ahora)', nuevo?.usados === 1 && nuevo?.inicio === reloj);
  await motor.bloquear({ cuentaDeLaSesion: carla, comoIdentidad: carlaReal, identidad: betoReal });
  const deCarla = await error(pedir(beto, betoWee, carlaReal));
  check('si OTRA cuenta (Carla) también lo bloquea, sus intentos van al MISMO contador de su cuenta, con el mismo rechazo genérico',
    deCarla?.motivo === 'relacion-invalida' && intentosDe(I.claveDeIntentos(beto, 'pedir'))?.usados === 2);
  check('el contador es solo del servidor: firestore.rules no nombra su colección', !leer('firestore.rules').includes(I.INTENTOS_BLOQUEADOS));
  check('y no guarda quién es el destino: solo la cuenta que intenta, la operación, el inicio, los usados y la hora',
    JSON.stringify(Object.keys(intentosDe(I.claveDeIntentos(beto, 'pedir')) || {}).sort()) === JSON.stringify(['actualizadoEn', 'cuenta', 'inicio', 'operacion', 'usados']));
}
{
  /* Concurrencia: diez intentos A LA VEZ contra quien te bloqueó. Las transacciones se serializan (como en Firestore, que reintenta la que choca). */
  const { base, motor } = nuevoMundo();
  const conCreate = (b) => ({
    collection: (p) => b.collection(p),
    runTransaction: (fn) => b.runTransaction((tx) => { tx.create = (ref, datos) => { if (b.leer(ref.path)) throw new Error(`ya existe ${ref.path}`); return tx.set(ref, datos); }; return fn(tx); }),
  });
  const ec = EC.createEContactEngine({ db: () => conCreate(base), ahora: () => 70_000_000, sello: (ms) => ms });
  await motor.bloquear({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: betoWee });
  const caras = [betoWee, betoReal];
  const resultados = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => ec.request({ cuentaDeLaSesion: beto, desdeIdentidad: caras[i % 2], haciaIdentidad: i % 3 ? anaReal : anaWee })));
  const contador = base.leer(`${I.INTENTOS_BLOQUEADOS}/${I.claveDeIntentos(beto, 'pedir')}`);
  check('concurrencia: diez intentos a la vez se rechazan todos con el genérico y el contador queda EXACTAMENTE en 5 (ni más, ni perdidos)',
    resultados.every((r) => r.status === 'rejected' && r.reason instanceof EC.EContactError && r.reason.motivo === 'relacion-invalida') && contador?.usados === 5);
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ weetalk-bloqueo: el bloqueo es de cuenta, cubre las dos caras, borra ËContact entre las cuentas, frena los intentos repetidos y no delata a nadie');
process.exit(failures ? 1 : 0);
