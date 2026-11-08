/*
 * WEETALK ES GRATUITO — decisión permanente del dueño (2026-11-07; docs/DECISIONES-DELIBERADAS.md § WeeTalk gratuito).
 *
 *   node test/weetalk-gratuidad.test.mjs
 *
 * La mensajería nunca usa Credits: enviar y recibir mensajes, crear y mantener conversaciones, pedir, aceptar o rechazar
 * ËContact, bloquear y desbloquear no reservan, ni cobran, ni reembolsan, ni acreditan, ni premian nada, y no dejan
 * transacciones en el historial de Credits. Sin emulador. Qué fija:
 *
 *   A  el código de WeeTalk en el servidor no llama al Credit Engine ni nombra sus colecciones (árbol de TypeScript:
 *      cuenta el código, no los comentarios), y tampoco los dos disparadores de push
 *   B  lo que el servidor de WeeTalk CARGA al arrancar desde Credits es solo lo documentado (validación y catálogo, por
 *      engine/errors), nunca el motor; y lo que llega del Financial Core es puro (sin Firestore)
 *   C  el código de WeeTalk en el cliente no importa ni llama a Credits; el ☰ que monta la bandeja solo LEE el saldo
 *   D  de verdad, sobre la Firestore en memoria y con cuentas con saldo: ËContact (pedir y aceptar en las cuatro
 *      combinaciones de caras) y el bloqueo (bloquear, listar, desbloquear) no cambian el saldo, ni el historial, ni las
 *      cuentas del Credit Engine, y no llaman a ninguna de sus funciones
 *   E  los mensajes y las conversaciones los escribe el cliente: sus escrituras solo tocan conversations y messages
 *
 * La única función de pago que puede aparecer junto a WeeTalk es el traductor, en su propio módulo y nunca en la
 * mensajería (decisión del dueño del mismo día). Si llega, no entra en ninguna de estas listas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

let failures = 0;
let n = 1;
const check = (nombre, cond, extra = '') => {
  console.log(`${cond ? '✔' : '✘'} ${n++}) ${nombre}${extra ? ` — ${extra}` : ''}`);
  if (!cond) failures++;
};

/* Lo que delata el uso del Credit Engine: sus funciones, sus colecciones y los clientes de Credits. */
const DE_CREDITS = ['spendCredits', 'completeCredits', 'refundCredits', 'reserveCredits', 'creditEngine', 'createCreditEngine',
  'creditTransactions', 'creditAccounts', 'creditsBalance', 'creditStats', 'wallets', 'getCreditsBalance', 'validatePurchase',
  'creditsService', 'useWallet', 'CreditsPill', 'usdToCredits', 'getCreditCost'];
/** Los nombres y textos del CÓDIGO (identificadores y literales), sin comentarios: lo que de verdad se ejecuta. */
const nombresDelCodigo = (archivo, texto) => {
  const vistos = new Set();
  const sf = ts.createSourceFile(archivo, texto, ts.ScriptTarget.Latest, true);
  const visitar = (nodo) => {
    if (ts.isIdentifier(nodo) || ts.isPrivateIdentifier(nodo)) vistos.add(nodo.text);
    if (ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) vistos.add(nodo.text);
    ts.forEachChild(nodo, visitar);
  };
  visitar(sf);
  return vistos;
};
const deCreditsEn = (archivo, texto) => {
  const nombres = nombresDelCodigo(archivo, texto);
  return [...DE_CREDITS.filter((x) => nombres.has(x)), ...[...nombres].filter((x) => /(^|\/)credits(\/|$)/.test(x) && /^\.{1,2}\//.test(x))];
};
/** Pura: el texto de una declaración `export const <nombre> = …` del archivo (el disparador entero). */
const declaracion = (archivo, texto, nombre) => {
  const sf = ts.createSourceFile(archivo, texto, ts.ScriptTarget.Latest, true);
  const st = sf.statements.find((s) => ts.isVariableStatement(s) && s.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === nombre));
  return st ? st.getText(sf) : '';
};

const SERVIDOR = ['functions/src/social/weetalk.ts', 'functions/src/social/econtact.ts', 'functions/src/social/weetalkBloqueos.ts',
  'functions/src/social/bloqueosIndice.ts', 'functions/src/social/avisos.ts'];
const CLIENTE = ['services/messagesService.ts', 'services/econtactService.ts', 'services/weetalkBloqueosService.ts',
  'screens/InboxScreen.tsx', 'screens/ConversationScreen.tsx', 'screens/EContactScreen.tsx', 'hooks/useConversaciones.ts', 'hooks/useEContact.ts'];

console.log('── A · El servidor de WeeTalk no llama al Credit Engine ──');
{
  for (const f of SERVIDOR) {
    const hallados = deCreditsEn(f, leer(f));
    check(`${f}: ni funciones, ni colecciones, ni importaciones de Credits`, hallados.length === 0, hallados.join(', '));
  }
  const indice = leer('functions/src/index.ts');
  for (const disparador of ['sendPushNotification', 'sendMessagePushNotification']) {
    const cuerpo = declaracion('index.ts', indice, disparador);
    const hallados = cuerpo ? deCreditsEn(`${disparador}.ts`, cuerpo) : ['(no encontrado)'];
    check(`el disparador ${disparador} (functions/src/index.ts) no toca Credits`, !!cuerpo && hallados.length === 0, hallados.join(', '));
  }
  check('CONTROL: el detector ve una llamada al motor en código y no se deja engañar por un comentario',
    deCreditsEn('x.ts', "import { creditEngine } from '../credits/creditEngine';\nawait creditEngine.spendCredits({});").length >= 2
    && deCreditsEn('x.ts', '// creditEngine.spendCredits() aquí NO se llama\nexport const y = 1;').length === 0);
}

console.log('\n── B · Lo que el servidor de WeeTalk carga de Credits al arrancar ──');
/** El cierre de importaciones relativas desde unos archivos de functions/src (resueltas a .ts o /index.ts). */
const cierre = (raices) => {
  const vistos = new Set();
  const pila = [...raices];
  while (pila.length) {
    const f = pila.pop();
    if (vistos.has(f)) continue;
    vistos.add(f);
    for (const { fileName: spec } of ts.preProcessFile(leer(f), true, true).importedFiles) {
      if (!/^\.{1,2}\//.test(spec)) continue;
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(f), spec)).replace(/\.(js|ts)$/, '');
      const destino = [`${base}.ts`, `${base}/index.ts`].find((c) => fs.existsSync(path.join(RAIZ, c)));
      if (destino) pila.push(destino);
    }
  }
  return [...vistos].sort();
};
{
  const alcanzados = cierre(SERVIDOR);
  const deCredits = alcanzados.filter((f) => f.startsWith('functions/src/credits/'));
  /* Documentado (auditoría del 2026-11-07): weetalkBloqueos → identity/sesion → engine/errors → credits/creditValidation → credits/creditCosts. */
  const PERMITIDOS = ['functions/src/credits/creditCosts.ts', 'functions/src/credits/creditValidation.ts'];
  check('de Credits, el servidor de WeeTalk solo carga la validación y el catálogo (por engine/errors), nunca el motor, sus callables ni su libro',
    deCredits.every((f) => PERMITIDOS.includes(f)) && !alcanzados.some((f) => /credits\/(creditEngine|index|aiPricing|creditTransactions)\.ts$/.test(f)),
    deCredits.join(', '));
  const financiero = alcanzados.filter((f) => f.startsWith('functions/src/core/financial/'));
  const conFirestore = financiero.filter((f) => /firebase-admin|getFirestore|fetch\(/.test(leer(f)));
  check('lo que llega del Financial Core es puro: ningún archivo suyo alcanzado usa Firestore ni la red', conFirestore.length === 0, conFirestore.join(', '));
  check('CONTROL: el cierre de importaciones sigue de verdad las rutas (desde weetalkBloqueos llega a engine/errors)',
    cierre(['functions/src/social/weetalkBloqueos.ts']).includes('functions/src/engine/errors.ts'));
}

console.log('\n── C · El cliente de WeeTalk no importa ni llama a Credits ──');
{
  for (const f of CLIENTE) {
    const hallados = deCreditsEn(f, leer(f));
    check(`${f}: sin Credits`, hallados.length === 0, hallados.join(', '));
  }
  const wallet = nombresDelCodigo('useWallet.ts', leer('hooks/useWallet.ts'));
  check('el ☰ que monta la bandeja solo LEE el saldo: useWallet se suscribe y no reserva, ni cobra, ni reembolsa',
    wallet.has('subscribeToBalance') && !['spendCredits', 'completeCredits', 'refundCredits', 'reserveCredits'].some((x) => wallet.has(x)));
}

console.log('\n── D · De verdad: ËContact y el bloqueo no tocan el saldo ni el historial ──');
{
  const { BaseEnMemoria, instalarLaBase, darDeAlta, lib } = await import(pathToFileURL(path.join(aqui, '_firestore-en-memoria.mjs')).href);
  const EC = lib('social/econtact.js');
  const B = lib('social/weetalkBloqueos.js');
  const { identidadesHeredadasDeLaCuenta: carasDe } = lib('identity/compatibilidad.js');
  const CE = lib('credits/creditEngine.js').creditEngine;
  const base = new BaseEnMemoria();
  const deshacer = instalarLaBase(() => base);
  try {
    /* Dos cuentas con saldo y sus dos caras, como las deja la app. */
    await darDeAlta(base, 'ana', { saldo: 500 });
    await darDeAlta(base, 'beto', { saldo: 300 });
    /* El Perfil Real es el documento que dejó el alta (con su saldo espejado); el Perfil Weë, otro documento de la misma cuenta. */
    Object.assign(base.docs.get('users/doc_ana'), { profileType: 'real', linkedAccountId: 'hidi_ana', displayName: 'Ana' });
    base.docs.set('users/doc_hidi_ana', { uid: 'hidi_ana', profileType: 'hidi', linkedAccountId: 'ana', displayName: 'Nube' });
    Object.assign(base.docs.get('users/doc_beto'), { profileType: 'real', linkedAccountId: 'hidi_beto', displayName: 'Beto' });
    base.docs.set('users/doc_hidi_beto', { uid: 'hidi_beto', profileType: 'hidi', linkedAccountId: 'beto', displayName: 'Sombra' });
    const COLECCIONES_DE_CREDITS = ['creditAccounts', 'creditTransactions', 'creditStats', 'wallets'];
    const fotoDeCredits = () => JSON.stringify([...base.docs.entries()]
      .filter(([p]) => COLECCIONES_DE_CREDITS.includes(p.split('/')[0]) || p.startsWith('users/'))
      .map(([p, d]) => [p, p.startsWith('users/') ? { creditsBalance: d.creditsBalance ?? null, lifetimeEarned: d.lifetimeEarned ?? null, lifetimeSpent: d.lifetimeSpent ?? null } : d])
      .sort(([a], [b]) => (a < b ? -1 : 1)));
    const antes = fotoDeCredits();
    /* Cada función del Credit Engine, contada a partir de aquí. */
    const llamadas = {};
    for (const [k, fn] of Object.entries(CE)) if (typeof fn === 'function') { llamadas[k] = 0; CE[k] = (...a) => { llamadas[k] += 1; return fn(...a); }; }
    const conCreate = (b) => ({
      collection: (p) => b.collection(p),
      runTransaction: (fn) => b.runTransaction((tx) => {
        tx.create = (ref, datos) => { if (b.leer(ref.path)) throw new Error(`ya existe ${ref.path}`); return tx.set(ref, datos); };
        return fn(tx);
      }),
    });
    let reloj = 1_000;
    const ec = EC.createEContactEngine({ db: () => conCreate(base), ahora: () => (reloj += 10), sello: (ms) => ms });
    const motor = B.createBloqueosEngine({ db: () => base, ahora: () => (reloj += 10), sello: (ms) => ms, carasDe });
    const combinaciones = [['ana', 'beto'], ['ana', 'hidi_beto'], ['hidi_ana', 'beto'], ['hidi_ana', 'hidi_beto']];
    let ok = 0;
    for (const [de, para] of combinaciones) {
      await ec.request({ cuentaDeLaSesion: 'ana', desdeIdentidad: de, haciaIdentidad: para });
      await ec.accept({ cuentaDeLaSesion: 'beto', comoIdentidad: para, otraIdentidad: de });
      ok += 1;
    }
    check('ËContact se pide y se acepta en las cuatro combinaciones de caras (Real→Real, Real→Weë, Weë→Real, Weë→Weë)', ok === 4
      && combinaciones.every(([de, para]) => base.leer(`econtacts/${EC.idDeContacto(de, para)}`)?.status === 'accepted'));
    await motor.bloquear({ cuentaDeLaSesion: 'ana', comoIdentidad: 'ana', identidad: 'hidi_beto' });
    const lista = (await motor.listar({ cuentaDeLaSesion: 'ana' })).bloqueados;
    await motor.desbloquear({ cuentaDeLaSesion: 'ana', identidad: 'hidi_beto' });
    check('bloquear, listar y desbloquear funcionan sobre la misma base', lista.length === 1 && (await motor.listar({ cuentaDeLaSesion: 'ana' })).bloqueados.length === 0);
    const usadas = Object.entries(llamadas).filter(([, c]) => c > 0).map(([k, c]) => `${k}×${c}`);
    check('ninguna función del Credit Engine se llamó durante ËContact ni el bloqueo', usadas.length === 0, usadas.join(', '));
    check('el saldo, el historial y las cuentas del Credit Engine están EXACTAMENTE como antes (ni un Credit, ni una transacción)', fotoDeCredits() === antes);
    check('y no aparece ninguna colección de Credits que no existiera', COLECCIONES_DE_CREDITS.every((c) => base.de(c).length === JSON.parse(antes).filter(([p]) => p.startsWith(`${c}/`)).length));
    check('CONTROL: la foto SÍ ve un cambio de saldo (si se tocara, esta prueba fallaría)', (() => {
      const d = base.docs.get('users/doc_ana'); const previo = d.creditsBalance; d.creditsBalance = previo + 1;
      const distinto = fotoDeCredits() !== antes; d.creditsBalance = previo; return distinto && fotoDeCredits() === antes;
    })());
  } finally {
    deshacer();
  }
}

console.log('\n── E · Los mensajes y las conversaciones (los escribe el cliente) solo tocan conversations y messages ──');
{
  const texto = leer('services/messagesService.ts');
  const colecciones = [...texto.matchAll(/collection\(\s*db\s*,\s*['"]([a-zA-Z]+)['"]/g)].map((m) => m[1]);
  const docs = [...texto.matchAll(/doc\(\s*db\s*,\s*['"]([a-zA-Z]+)['"]/g)].map((m) => m[1]);
  const fuera = [...new Set([...colecciones, ...docs])].filter((c) => !['conversations', 'messages'].includes(c));
  check('messagesService solo nombra conversations y messages como colecciones de Firestore', colecciones.length > 0 && fuera.length === 0, fuera.join(', '));
  const reglas = leer('firestore.rules');
  const bloque = (desde, hasta) => reglas.slice(reglas.indexOf(desde), reglas.indexOf(hasta, reglas.indexOf(desde) + 1));
  const conversaciones = bloque('match /conversations/{conversationId}', '\n    match /');
  check('las reglas de conversaciones y mensajes no leen ni escriben nada de Credits', conversaciones.includes('match /messages/{messageId}') && !/credit|wallet/i.test(conversaciones));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
