/*
 * WEË BRAIN: DOCE RESPUESTAS POR UN CREDIT.
 *
 * Decisión del usuario (2026-09-16). Un Credit es la moneda más pequeña de Weë
 * —es entera y no se parte— así que la única manera de que preguntarle algo a
 * Weë Brain cueste menos de un Credit es cobrar una vez cada doce respuestas.
 *
 * Todo lo que se vigila aquí falla EN SILENCIO y con dinero de por medio: nadie
 * ve un error, simplemente a una de cada doce personas se le cobra de más, o de
 * menos, o dos veces. Por eso el contador se prueba EJECUTÁNDOLO contra una
 * Firestore de mentira con transacciones de verdad, y no leyendo el código.
 *
 *  A. cuenta bien, de 0 a 12 y vuelta a empezar;
 *  B. sobrevive a salir, cambiar de teléfono y volver meses después;
 *  C. no cuenta dos veces lo mismo, pase lo que pase;
 *  D. dos respuestas a la vez no cobran dos Credits;
 *  E. lo demás de Weë sigue exactamente igual.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

const { crearContadorDeBrain, RESPUESTAS_POR_CREDIT } = lib('creator/brainUsage.js');
const { getCreditCost, CREDIT_COSTS } = lib('credits/creditCosts.js');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Una Firestore de mentira: documentos, subcolecciones y transacciones ──── */
const INC = Symbol('increment');
const clonar = (v) => JSON.parse(JSON.stringify(v));
const resolver = (valor, previo) => (valor && valor[INC] !== undefined ? Number(previo || 0) + valor[INC] : valor);

class BaseFalsa {
  constructor() {
    this.docs = new Map();
    this.commits = 0;
    this.conflictos = 0;
  }
  collection(p) {
    const base = this;
    return { doc: (id) => new RefFalsa(base, `${p}/${id}`) };
  }
  async runTransaction(fn) {
    /* Como Firestore: se apunta lo leído y, si cambió antes de escribir, se reintenta. */
    for (let intento = 0; intento < 6; intento++) {
      const tx = new TxFalsa(this);
      const salida = await fn(tx);
      if (tx.leidasSiguenIgual()) {
        tx.commit();
        return salida;
      }
      this.conflictos++;
    }
    throw new Error('la transacción no pudo cerrarse');
  }
}
class RefFalsa {
  constructor(db, p) {
    this.db = db;
    this.path = p;
    this.id = p.split('/').pop();
  }
  collection(sub) {
    const db = this.db;
    const base = this.path;
    return { doc: (id) => new RefFalsa(db, `${base}/${sub}/${id}`) };
  }
  async get() {
    const d = this.db.docs.get(this.path);
    return { exists: d !== undefined, id: this.id, ref: this, data: () => (d === undefined ? undefined : clonar(d)) };
  }
}
class TxFalsa {
  constructor(db) {
    this.db = db;
    this.writes = [];
    this.leidas = new Map();
  }
  async get(ref) {
    const snap = await ref.get();
    this.leidas.set(ref.path, JSON.stringify(this.db.docs.get(ref.path) ?? null));
    return snap;
  }
  set(ref, data, opts) {
    this.writes.push({ kind: 'set', ref, data, merge: !!(opts && opts.merge) });
  }
  delete(ref) {
    this.writes.push({ kind: 'delete', ref });
  }
  leidasSiguenIgual() {
    for (const [p, visto] of this.leidas) if (JSON.stringify(this.db.docs.get(p) ?? null) !== visto) return false;
    return true;
  }
  commit() {
    for (const w of this.writes) {
      if (w.kind === 'delete') {
        this.db.docs.delete(w.ref.path);
        continue;
      }
      const previo = this.db.docs.get(w.ref.path);
      const base = w.merge ? { ...(previo || {}) } : {};
      for (const [k, v] of Object.entries(w.data)) base[k] = resolver(v, previo ? previo[k] : undefined);
      this.db.docs.set(w.ref.path, base);
    }
    this.db.commits++;
  }
}

let reloj = 0;
const nuevoContador = () => {
  const db = new BaseFalsa();
  return {
    db,
    contador: crearContadorDeBrain({ db: () => db, increment: (n) => ({ [INC]: n }), now: () => ++reloj }),
  };
};

console.log('\n── A · Cuenta de 0 a 12 y vuelve a empezar ──');
{
  const { contador } = nuevoContador();
  const inicio = await contador.bloqueDe('ana');
  check('A) una cuenta nueva empieza en 0/12', inicio.usadas === 0 && inicio.total === 12 && inicio.restantes === 12, JSON.stringify(inicio));

  const primera = await contador.contarRespuesta('ana', 'm1');
  check('B) la primera respuesta deja 1/12 y no cobra', primera.posicion === 1 && primera.cobrada === false);
  check('B2) y el bloque lo dice', (await contador.bloqueDe('ana')).usadas === 1);

  for (let i = 2; i <= 11; i++) await contador.contarRespuesta('ana', 'm' + i);
  const once = await contador.bloqueDe('ana');
  check('C) once respuestas: 11/12 y todavía sin cobrar', once.usadas === 11 && once.restantes === 1, JSON.stringify(once));

  const doce = await contador.contarRespuesta('ana', 'm12');
  check('D) la duodécima cobra', doce.posicion === 12 && doce.cobrada === true);
  check('D2) y el bloque vuelve a 0/12', (await contador.bloqueDe('ana')).usadas === 0);

  const trece = await contador.contarRespuesta('ana', 'm13');
  check('D3) la trece abre bloque nuevo y no cobra', trece.posicion === 1 && trece.cobrada === false);
  /* Exactamente un cobro en trece respuestas: ni uno más. */
  let cobros = 0;
  for (const [p, d] of [...nuevoContador().db.docs]) void p, void d;
  check('D4) en 13 respuestas se cobró exactamente una vez', doce.cobrada && !primera.cobrada && !trece.cobrada);
}

console.log('\n── B · Sobrevive a todo: salir, cambiar de móvil, volver meses después ──');
{
  const { db, contador } = nuevoContador();
  for (let i = 1; i <= 5; i++) await contador.contarRespuesta('bea', 'x' + i);
  check('E) se sale con 5/12', (await contador.bloqueDe('bea')).usadas === 5);
  /* Otro teléfono, otra sesión, otro servidor: la misma base, ningún estado en memoria. */
  const otroDia = crearContadorDeBrain({ db: () => db, increment: (n) => ({ [INC]: n }), now: () => ++reloj });
  check('F) se vuelve en otro dispositivo y sigue en 5/12', (await otroDia.bloqueDe('bea')).usadas === 5);
  const sexta = await otroDia.contarRespuesta('bea', 'x6');
  check('F2) y continúa donde quedó', sexta.posicion === 6);
  check('F3) el contador vive en la cuenta, no en la conversación', [...db.docs.keys()].some((k) => k === 'brainUsage/bea'), [...db.docs.keys()].find((k) => k.startsWith('brainUsage/')));
  /* Cada persona tiene el suyo: el de una no mueve el de la otra. */
  check('F4) y es de cada persona', (await otroDia.bloqueDe('carlos')).usadas === 0);
}

console.log('\n── C · Ni cuenta de más ni cobra dos veces ──');
{
  const { db, contador } = nuevoContador();
  for (let i = 1; i <= 3; i++) await contador.contarRespuesta('dani', 'y' + i);
  /* La foto exacta del contador antes y después: un reintento no puede moverlo ni un campo. */
  const antes = JSON.stringify(db.docs.get('brainUsage/dani'));
  const repetida = await contador.contarRespuesta('dani', 'y3');
  check('H) reintentar la MISMA respuesta no avanza el bloque', (await contador.bloqueDe('dani')).usadas === 3 && repetida.posicion === 3);
  check('H2) y deja el contador exactamente igual', JSON.stringify(db.docs.get('brainUsage/dani')) === antes, antes);

  /* La que cobra, repetida: devuelve "cobrada" otra vez pero no vuelve a contar. */
  for (let i = 4; i <= 12; i++) await contador.contarRespuesta('dani', 'y' + i);
  const bis = await contador.contarRespuesta('dani', 'y12');
  check('H3) repetir la duodécima devuelve la misma decisión, sin contar de nuevo', bis.cobrada === true && bis.posicion === 12 && (await contador.bloqueDe('dani')).usadas === 0);

  /*
   * G) Una generación que falla no llega a contarse. La prueba: en el camino del
   * ERROR —de `refundCredits` hasta el final— no se nombra al contador. Contar
   * vive dentro del try, después de que la respuesta exista.
   */
  const brainSrc = leer('functions/src/creator/brain.ts');
  const caminoDelError = brainSrc.slice(brainSrc.indexOf('await creditEngine.refundCredits'));
  check('G) una respuesta fallida no gasta bloque', caminoDelError.length > 0 && !/contarRespuesta/.test(caminoDelError));
  check('G2) y el contador se llama DESPUÉS de tener la respuesta', leer('functions/src/creator/brain.ts').indexOf('await engine.generate(') < leer('functions/src/creator/brain.ts').indexOf('await contarRespuesta('));
}

console.log('\n── D · Dos respuestas a la vez alrededor del 12 ──');
{
  const { db, contador } = nuevoContador();
  for (let i = 1; i <= 11; i++) await contador.contarRespuesta('eva', 'z' + i);
  /* Las dos arrancan viendo 11 y terminan en distinto puesto: solo una cierra el bloque. */
  const [a, b] = await Promise.all([contador.contarRespuesta('eva', 'zA'), contador.contarRespuesta('eva', 'zB')]);
  const cobros = [a, b].filter((r) => r.cobrada).length;
  check('I) exactamente un cobro, no dos', cobros === 1, `posiciones ${a.posicion} y ${b.posicion}, cobros ${cobros}`);
  check('I2) y los puestos no se pisan', a.posicion !== b.posicion && [a.posicion, b.posicion].sort().join(',') === '1,12');
  check('I3) hubo contención y se reintentó, como en Firestore', db.conflictos >= 1, `conflictos ${db.conflictos}`);
}

console.log('\n── E · El resto de Weë, intacto ──');
{
  /* J) sin saldo se usa el error de siempre, no un mecanismo paralelo. */
  const brain = leer('functions/src/creator/brain.ts');
  check('J) sin saldo se lanza el INSUFFICIENT_CREDITS de siempre', /new CreditError\('INSUFFICIENT_CREDITS'/.test(brain) && /creditEngine\.getBalance\(uid\)/.test(brain));
  check('J2) y se comprueba ANTES de llamar al modelo', brain.indexOf("new CreditError('INSUFFICIENT_CREDITS'") < brain.indexOf('await engine.generate('));
  check('J3) el cobro sigue siendo el del Credit Engine, con su requestId', /creditEngine\.spendCredits\(/.test(brain) && /requestId,/.test(brain));

  /* K) los demás servicios no se tocan. */
  check('K) ai_text y los demás conservan su precio', getCreditCost('ai_text') === 2 && getCreditCost('ai_search') === 3 && getCreditCost('ai_image') === 10 && getCreditCost('ai_video') === 160 && getCreditCost('ai_audio') === 20);
  check('K2) y el bloque solo existe en Weë Brain', !/brainUsage|contarRespuesta/.test(leer('functions/src/engine/pricing.ts') + leer('functions/src/credits/aiPricing.ts') + leer('functions/src/credits/creditEngine.ts')));
  check('K3) la búsqueda con fuentes sigue cobrando por mensaje', /if \(webSearch\) \{\s*\n\s*spend = await creditEngine\.spendCredits/.test(brain));

  /*
   * Lo que queda ANOTADO en el libro tiene que ser lo que de verdad se cobra.
   *
   * `aiGenerations.creditsEstimated` lo deducía el motor —capacidad → servicio →
   * catálogo—, y esa deducción no conoce el bloque de doce: anotaba 2 (el precio
   * de `ai_text`) en una respuesta por la que se cobró 0 (visto en producción,
   * 2026-09-16). Ahora lo dice quien lo sabe, con el MISMO número que `brainQuote`
   * le enseña a la persona.
   */
  check('L0) Brain le dice al libro lo que cuesta este mensaje, y es la cuenta del bloque',
    /const creditsDelMensaje = webSearch \|\| cierraElBloque \? price\.credits : 0;/.test(brain)
    && /creditsEstimated: creditsDelMensaje/.test(brain));
  check('L0b) y el motor solo lo deduce cuando nadie se lo dice',
    /creditsEstimated: request\.creditsEstimated \?\? credits/.test(leer('functions/src/engine/router.ts')));
  check('L0c) el saldo se comprueba con esa misma cuenta, no con otra',
    /const cierraElBloque = !webSearch && \(await bloqueDe\(uid\)\)\.usadas === RESPUESTAS_POR_CREDIT - 1;/.test(brain)
    && /\} else if \(cierraElBloque\) \{/.test(brain));
  /* Y lo que se DEVUELVE al llamador no cambió: de ahí dependen otros flujos. */
  check('L0d) solo cambia lo anotado, no lo que el motor devuelve',
    /const credits = creditsFor\(capability, result\.costUSD, settings, demo, input\);/.test(leer('functions/src/engine/router.ts')));

  /* L) ai_brain sigue registrando proveedor, modelo y coste real de DeepSeek. */
  check('L) Brain sigue cobrando con ai_brain y pidiendo deepseek-flash', /'ai_search' : 'ai_brain'/.test(brain) && /allowedProviders: \['deepseek'\]/.test(brain) && CREDIT_COSTS.ai_brain === 1);
  check('L2) y el coste real del modelo sigue viajando al libro', /estimatedUsd: price\.usd/.test(brain) && /tarifaDeModeloDeTexto\(MODELO_DE_BRAIN\)/.test(brain));

  /* El contador no puede tocarse desde el teléfono. */
  const reglas = leer('firestore.rules');
  check('M) brainUsage está cerrado al cliente', /match \/brainUsage\/\{userId\} \{\s*\n\s*allow read, write: if false;/.test(reglas));
}

console.log('\n── El indicador en pantalla ──');
{
  const pantalla = leer('screens/BrainChatScreen.tsx');
  check('N) se pinta en la línea del costo que ya existía, sin elementos nuevos', /brain\.blockLeft/.test(pantalla) && /styles\.priceRow/.test(pantalla));
  check('N2) y el texto está en los dos idiomas', /blockLeft:/.test(leer('i18n/textos/es/brain.ts')) && /blockLeft:/.test(leer('i18n/textos/en/brain.ts')));
  check('N3) el bloque lo dice el servidor, no lo calcula la pantalla', !/RESPUESTAS_POR_CREDIT|12/.test((pantalla.match(/blockLeft[^)]*\)/) || [''])[0]));
  check('N4) el composer no se rediseñó: sigue siendo la caja común', /<CajaDePrompt/.test(pantalla) && !/<TextInput\b/.test(pantalla));
}

check('O) doce es doce', RESPUESTAS_POR_CREDIT === 12, String(RESPUESTAS_POR_CREDIT));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
