/*
 * WEETALK · BLOQUEO DE CONTACTOS — la regla común, el motor y lo que no se puede filtrar (docs/WEETALK-BLOQUEO.md).
 *
 *   node test/weetalk-bloqueo.test.mjs
 *
 * Sin emulador: la regla es pura, y el motor se recorre DE VERDAD (el compilado de functions/lib) sobre la Firestore
 * en memoria de las suites de aceptación. Lo que exige las reglas de Firestore —que el mensaje no llegue a guardarse—
 * es una PROPUESTA sin aplicar (ops/propuestas/weetalk-bloqueo): aquí se comprueba que compone sobre las reglas de hoy
 * y que no está aplicada; ejecutarla en el emulador es `ops/propuestas/weetalk-bloqueo/correr-reglas.mjs`.
 *
 *   A  la regla común «¿puede X escribir a Y?», por cuentas, contra una especificación escrita aparte
 *   B  el índice que leerían las reglas dice exactamente lo mismo que la regla (256 configuraciones, 2048 casos)
 *   C  lo guardado se lee con desconfianza
 *   D  el motor: bloquear, idempotencia, las dos caras, evasión, el aviso push, desbloquear, la lista y los errores
 *   E  privacidad: la lista solo es de quien bloquea, nadie se entera, y nada delata la otra cara de nadie
 *   F  sin inspección: la lógica del bloqueo no lee mensajes ni toca la moderación
 *   G  el cableado: el push, las callables, el despliegue, la cadena y el dominio
 *   H  la propuesta de reglas: compone, cubre los tres caminos y NO está aplicada
 *   I  sabotaje: con la regla rota a propósito, estas comprobaciones fallan
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
  check('las 8 combinaciones Real/Weë entre las dos cuentas, como dice la especificación (4 prohibidas, 4 permitidas)', malos.length === 0, malos.map((m) => m.join('→')).join(', '));
  const protegida = decide(B.puedeEscribir, relAB, null, betoWee, anaReal);
  const evasion = decide(B.puedeEscribir, relAB, null, betoReal, anaReal);
  check('Beto no escribe a la cara de Ana que lo bloqueó, y cambiar de cara NO lo evade', !protegida.puede && !evasion.puede && protegida.motivo === 'cara-protegida' && evasion.motivo === 'cara-protegida');
  const bloqueada = decide(B.puedeEscribir, relAB, null, anaReal, betoWee);
  const desdeOtra = decide(B.puedeEscribir, relAB, null, anaWee, betoWee);
  check('Ana no escribe a la cara que bloqueó, ni desde su otra cara (hasta desbloquear)', !bloqueada.puede && !desdeOtra.puede && bloqueada.motivo === 'cara-bloqueada' && desdeOtra.motivo === 'cara-bloqueada');
  check('Beto SÍ escribe a la otra cara de Ana: si fallara, sabría cuál es (no se le revela)', decide(B.puedeEscribir, relAB, null, betoReal, anaWee).puede && decide(B.puedeEscribir, relAB, null, betoWee, anaWee).puede);
  check('Ana SÍ escribe a la otra cara de Beto: si fallara, sabría cuál es', decide(B.puedeEscribir, relAB, null, anaReal, betoReal).puede && decide(B.puedeEscribir, relAB, null, anaWee, betoReal).puede);
  check('las dos caras de una misma cuenta nunca se bloquean entre sí',
    B.puedeEscribir({ de: conCuenta(anaReal), para: conCuenta(anaWee), bloqueoDelDestino: relAB, bloqueoPropio: relAB }).puede);
  check('una relación que no habla de esas dos cuentas, en ese orden, no cuenta',
    B.puedeEscribir({ de: conCuenta(betoWee), para: conCuenta(anaReal), bloqueoDelDestino: relacion(ana, carla, [[anaReal, carlaReal]]), bloqueoPropio: null }).puede
    && B.puedeEscribir({ de: conCuenta(betoWee), para: conCuenta(anaReal), bloqueoDelDestino: null, bloqueoPropio: relAB }).puede);
  check('sin bloqueos, todo se puede', cruzadas.every(([de, para]) => decide(B.puedeEscribir, null, null, de, para).puede));
  check('la regla no recibe el mensaje: solo quién y a quién (dos caras con su cuenta y dos relaciones)', B.puedeEscribir.length === 1
    && /bloqueoDelDestino/.test(B.puedeEscribir.toString()) && !/content|text|imageUrl|message/i.test(B.puedeEscribir.toString()));
}

console.log('\n── B · El índice de las reglas dice exactamente lo mismo que la regla ──');
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
  check('el bloqueo del escenario deja escritos exactamente sus cuatro pares',
    JSON.stringify(B.paresBloqueados([E.BLOQUEO_DE_ANA], carasDe)) === JSON.stringify(E.PARES_DEL_BLOQUEO_DE_ANA));
  check('entre dos cuentas caben ocho pares, en los dos sentidos; entre una cuenta y ella misma, ninguno',
    B.paresPosibles(ana, beto, carasDe).length === 8 && B.paresPosibles(ana, ana, carasDe).length === 0 && B.paresPosibles('no/es-cuenta', beto, carasDe).length === 0);
  check('el índice incluye la cara Weë de una cuenta aunque todavía no exista: el día que la cree ya está cubierta',
    B.paresBloqueados([relacion(ana, beto, [[anaReal, betoReal]])], carasDe).includes(`${betoWee}~${anaReal}`));
  check('la clave del par es la que compone la propuesta de reglas (`de + \'~\' + para`)',
    B.claveDePar(betoWee, anaReal) === `${betoWee}${P.SEPARADOR_DEL_INDICE}${anaReal}` && B.PARES === P.COLECCION_DEL_INDICE);
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
  check('y el índice queda con los cuatro pares de la especificación', JSON.stringify(indiceDe(base)) === JSON.stringify(E.PARES_DEL_BLOQUEO_DE_ANA), indiceDe(base).join(' '));
  check('el cupo cuenta UNA cuenta bloqueada', base.leer(`${B.CUPOS}/${ana}`)?.relaciones === 1);
  const r2 = await motor.bloquear({ cuentaDeLaSesion: ana, comoIdentidad: anaReal, identidad: betoWee });
  check('repetirlo es idempotente: «ya estaba», misma relación, mismo índice, mismo cupo',
    r2.yaEstaba === true && base.leer(`${B.BLOQUEOS}/${ana}~${beto}`).entradas.length === 1
    && JSON.stringify(indiceDe(base)) === JSON.stringify(E.PARES_DEL_BLOQUEO_DE_ANA) && base.leer(`${B.CUPOS}/${ana}`).relaciones === 1);

  const aviso = (de, para) => motor.permiteAviso(conCuenta(de), conCuenta(para));
  check('push: un mensaje de Beto (Weë) no suena en el teléfono de Ana', (await aviso(betoWee, anaReal)) === false);
  check('push: Beto cambia de cara (Real) y tampoco suena: la evasión no funciona', (await aviso(betoReal, anaReal)) === false);
  check('push: lo de Ana a la cara que bloqueó tampoco', (await aviso(anaReal, betoWee)) === false && (await aviso(anaWee, betoWee)) === false);
  check('push: a la otra cara de Ana sí suena (no se delata), y de Ana a la otra cara de Beto también',
    (await aviso(betoReal, anaWee)) === true && (await aviso(anaReal, betoReal)) === true);
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

  /* Beto bloquea también a Ana (desde su Perfil Real, viendo la cara Weë de Ana): los índices se suman sin pisarse. */
  await motor.bloquear({ cuentaDeLaSesion: beto, comoIdentidad: betoReal, identidad: anaWee });
  const ambos = B.paresBloqueados([B.relacionGuardada(base.leer(`${B.BLOQUEOS}/${ana}~${beto}`), ana, beto, carasDe), B.relacionGuardada(base.leer(`${B.BLOQUEOS}/${beto}~${ana}`), beto, ana, carasDe)], carasDe);
  check('si Beto también bloquea a Ana, el índice es la UNIÓN de los dos bloqueos', JSON.stringify(indiceDe(base)) === JSON.stringify(ambos) && ambos.length > 4, `${ambos.length} pares`);

  const d1 = await motor.desbloquear({ cuentaDeLaSesion: ana, identidad: betoWee });
  check('Ana desbloquea: «estaba», su relación desaparece y su cupo baja', d1.estaba === true && d1.bloqueado === false
    && !base.leer(`${B.BLOQUEOS}/${ana}~${beto}`) && base.leer(`${B.CUPOS}/${ana}`).relaciones === 0);
  const soloDeBeto = B.paresBloqueados([B.relacionGuardada(base.leer(`${B.BLOQUEOS}/${beto}~${ana}`), beto, ana, carasDe)], carasDe);
  check('y en el índice queda SOLO lo que Beto sigue bloqueando: desbloquear uno no abre lo que el otro cierra', JSON.stringify(indiceDe(base)) === JSON.stringify(soloDeBeto));
  check('push tras desbloquear: Beto (Weë) vuelve a sonarle a Ana', (await aviso(betoWee, anaReal)) === true);
  const d2 = await motor.desbloquear({ cuentaDeLaSesion: ana, identidad: betoWee });
  check('desbloquear otra vez no es un error: «no estaba»', d2.estaba === false && d2.bloqueado === false);
  await motor.desbloquear({ cuentaDeLaSesion: beto, identidad: anaWee });
  check('cuando nadie bloquea a nadie, el índice entre las dos cuentas queda vacío', indiceDe(base).length === 0 && base.de(B.BLOQUEOS).length === 0);
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
  const reglas = leer('firestore.rules');
  check('las tres colecciones son SOLO del servidor: firestore.rules no las nombra y no hay comodín que las abra',
    ![B.BLOQUEOS, B.PARES, B.CUPOS].some((c) => reglas.includes(c)) && !/match \/\{document=\*\*\}/.test(reglas));
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

console.log('\n── H · La propuesta de reglas: compone, cubre los tres caminos y NO está aplicada ──');
{
  const reglas = leer('firestore.rules');
  const propuesta = fs.readFileSync(P.RUTA_DE_LA_PROPUESTA, 'utf8');
  let compuesta = null;
  let motivo = '';
  try { compuesta = P.componerPropuesta(reglas, propuesta); } catch (e) { motivo = e.message; }
  check('compone sobre las reglas de hoy (el bloque de conversaciones sigue siendo el de W0)', !!compuesta, motivo);
  const actual = P.bloqueDeConversaciones(reglas);
  const nueva = compuesta ? P.bloqueDeConversaciones(compuesta) : null;
  check('fuera del bloque de conversaciones, las reglas compuestas son idénticas byte a byte',
    !!nueva && nueva.texto.slice(0, nueva.inicio) === actual.texto.slice(0, actual.inicio) && nueva.texto.slice(nueva.fin) === actual.texto.slice(actual.fin)
    && compuesta.includes('\r\n') === reglas.includes('\r\n'));
  const b = nueva ? nueva.bloque : '';
  check('pregunta al índice del servidor con la misma clave', b.includes(`exists(/databases/$(database)/documents/${P.COLECCION_DEL_INDICE}/$(de + '~' + para))`));
  check('cubre los tres caminos que escribe el cliente: crear conversación, actualizarla y crear un mensaje',
    /allow create:[\s\S]*?!chatBloqueadoPara\(request\.resource\.data\.participants\);/.test(b)
    && /allow update:[\s\S]*?\(!chatBloqueadoPara\(resource\.data\.participants\) \|\| cambioPermitidoConBloqueo\(\)\);/.test(b)
    && /match \/messages\/\{messageId\}[\s\S]*allow create:[\s\S]*?!bloqueado\(request\.resource\.data\.senderId, laOtraEn\(participantesDelChat\(\), request\.resource\.data\.senderId\)\);/.test(b));
  check('y no cambia quién LEE: el historial sigue siendo de los dos participantes',
    b.slice(b.indexOf('allow read:'), b.indexOf(';', b.indexOf('allow read:'))) === actual.bloque.slice(actual.bloque.indexOf('allow read:'), actual.bloque.indexOf(';', actual.bloque.indexOf('allow read:'))));
  check('la propuesta NO está aplicada: firestore.rules no conoce el índice (aplicarla exige la autorización del dueño y actualizar esta comprobación)',
    !reglas.includes(P.COLECCION_DEL_INDICE) && P.huellaDe(actual.bloque) === P.HUELLA_DEL_BLOQUE_DE_W0);
  check('si el bloque de conversaciones cambia, la propuesta se niega a componer (hay que revisarla)',
    (() => { try { P.componerPropuesta(reglas.replace('allow delete: if false;\n\n      // Mensajes', 'allow delete: if false;\n\n      // Mensajes (cambiado)'), propuesta); return false; } catch { return true; } })());
  const prueba = leer('ops/propuestas/weetalk-bloqueo/reglas.prueba.mjs');
  const corredor = await import(pathToFileURL(path.join(RAIZ, 'ops/propuestas/weetalk-bloqueo/correr-reglas.mjs')).href);
  check('las pruebas de reglas están preparadas fuera de la CI (no son `*.emulator.mjs`) y con su sabotaje',
    !fs.readdirSync(aqui).some((f) => /bloqueo/i.test(f) && f.endsWith('.emulator.mjs')) && /Sabotaje/.test(prueba) && /componerPropuesta\(reglasActuales\)/.test(prueba));
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
  /* «Todas las caras de quien bloquea»: Beto descubriría la otra cara de Ana. */
  const todasLasDeAna = (a) => (a.de.cuenta !== a.para.cuenta && (a.bloqueoDelDestino || a.bloqueoPropio) ? { puede: false } : { puede: true });
  check('una regla que solo bloquea la cara que se vio deja escapar a Beto: la especificación lo detecta', contra(soloLaCara) > 0, `${contra(soloLaCara)} casos`);
  check('una regla que protege todas las caras de Ana la delata: la especificación lo detecta', contra(todasLasDeAna) > 0, `${contra(todasLasDeAna)} casos`);
  check('y la de verdad, ninguno', contra(B.puedeEscribir) === 0);
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ weetalk-bloqueo: el bloqueo es de cuenta, cubre las dos caras y no delata a nadie');
process.exit(failures ? 1 : 0);
