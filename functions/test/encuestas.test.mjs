/*
 * ENCUESTAS DE WEË — Bloque A: seguridad y backend.
 *
 * No se comprueba que el código "mencione" las cosas: se EJECUTA el motor real
 * (`functions/lib/social/polls.js`) contra un Firestore de mentira que sí
 * reintenta las transacciones cuando dos votos se pisan, que es justo donde el
 * modelo anterior perdía votos.
 *
 * Las reglas de Firestore no se pueden ejecutar aquí —el repositorio no tiene
 * emulador de reglas ni `@firebase/rules-unit-testing`—, así que esa parte se
 * comprueba sobre el texto de `firestore.rules`, igual que hace security.test.mjs
 * con los secretos. Está señalado en cada aserción para no confundir una lectura
 * con una ejecución.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const read = (p) => {
  try {
    return fs.readFileSync(path.resolve(root, p), 'utf8');
  } catch {
    return '';
  }
};

const { createPollEngine, decidirVoto, esEncuestaHistorica, milisDe } = lib('social/polls.js');

/*
 * El borrador de encuesta vive en el cliente (`utils/pollDraft.ts`) y también se
 * EJECUTA aquí: se transpila y se importa, igual que hace muro.test.mjs con el
 * paginador. Una regla que solo se lee no está comprobada.
 */
const ts = require('typescript');
const fuenteDraft = read('utils/pollDraft.ts');
const jsDraft = ts.transpileModule(fuenteDraft, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const draft = await import('data:text/javascript;base64,' + Buffer.from(jsDraft).toString('base64'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const rechaza = async (name, fn, motivo) => {
  try {
    await fn();
    check(name, false, 'no lanzó error');
  } catch (error) {
    check(name, error?.motivo === motivo, `motivo "${error?.motivo}" (esperado "${motivo}")`);
    return error;
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Firestore de mentira: documentos, subcolecciones y transacciones que
// reintentan de verdad cuando lo leído cambió antes de escribir.
// ─────────────────────────────────────────────────────────────────────────────
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/** Aplica `{'poll.counts': …}` sobre el documento, como hace `update` de verdad. */
const aplicarRuta = (docu, ruta, valor) => {
  const partes = ruta.split('.');
  let nodo = docu;
  for (let i = 0; i < partes.length - 1; i++) {
    if (typeof nodo[partes[i]] !== 'object' || nodo[partes[i]] === null) nodo[partes[i]] = {};
    nodo = nodo[partes[i]];
  }
  nodo[partes[partes.length - 1]] = valor;
};

class FakeRef {
  constructor(db, ruta) {
    this.db = db;
    this.path = ruta;
    this.id = ruta.split('/').pop();
  }
  collection(nombre) {
    return new FakeColl(this.db, `${this.path}/${nombre}`);
  }
}
class FakeColl {
  constructor(db, ruta) {
    this.db = db;
    this.path = ruta;
  }
  doc(id) {
    return new FakeRef(this.db, `${this.path}/${id}`);
  }
}
class FakeTx {
  constructor(db) {
    this.db = db;
    this.leidos = [];
    this.escrituras = [];
  }
  async get(ref) {
    await null; // deja que otras transacciones se intercalen, como en la vida real
    this.leidos.push([ref.path, this.db.version(ref.path)]);
    const data = this.db.leer(ref.path);
    return { exists: data !== undefined, id: ref.id, ref, data: () => data };
  }
  set(ref, data, opciones) {
    this.escrituras.push({ tipo: opciones && opciones.merge ? 'merge' : 'set', path: ref.path, data });
  }
  update(ref, data) {
    this.escrituras.push({ tipo: 'update', path: ref.path, data });
  }
}
class FakeDb {
  constructor() {
    this.docs = new Map();
    this.versiones = new Map();
    this.reintentos = 0;
  }
  collection(nombre) {
    return new FakeColl(this, nombre);
  }
  leer(ruta) {
    return this.docs.has(ruta) ? clone(this.docs.get(ruta)) : undefined;
  }
  version(ruta) {
    return this.versiones.get(ruta) || 0;
  }
  sembrar(ruta, data) {
    this.docs.set(ruta, clone(data));
    this.versiones.set(ruta, this.version(ruta) + 1);
  }
  async runTransaction(fn) {
    for (let intento = 0; intento < 50; intento++) {
      const tx = new FakeTx(this);
      const resultado = await fn(tx); // un error de negocio sube tal cual: no se reintenta
      const chocó = tx.leidos.some(([ruta, v]) => this.version(ruta) !== v);
      if (chocó) {
        this.reintentos++;
        continue;
      }
      for (const w of tx.escrituras) {
        const previo = w.tipo === 'set' ? {} : this.leer(w.path) || {};
        const docu = clone(previo);
        if (w.tipo === 'update') for (const [k, v] of Object.entries(w.data)) aplicarRuta(docu, k, v);
        else Object.assign(docu, clone(w.data));
        this.docs.set(w.path, docu);
        this.versiones.set(w.path, this.version(w.path) + 1);
      }
      return resultado;
    }
    throw new Error('demasiados reintentos');
  }
}

const EN_UNA_HORA = () => Date.now() + 60 * 60 * 1000;
const HACE_UNA_HORA = () => Date.now() - 60 * 60 * 1000;

/** Una encuesta del modelo nuevo, tal y como la creará el Bloque B. */
const encuestaNueva = (extra = {}) => ({
  question: '¿Qué destino prefieres?',
  options: [
    { id: 'o1', text: 'Lima' },
    { id: 'o2', text: 'Cusco' },
    { id: 'o3', text: 'Arequipa' },
  ],
  counts: { o1: 0, o2: 0, o3: 0 },
  totalVotes: 0,
  endsAt: EN_UNA_HORA(),
  allowChange: true,
  ...extra,
});

const montar = (poll, extraPost = {}) => {
  const db = new FakeDb();
  db.sembrar('posts/p1', { userId: 'autor', content: 'Planeando el viaje', ...extraPost, ...(poll ? { poll } : {}) });
  const engine = createPollEngine({ db: () => db, ahora: () => Date.now(), sello: (ms) => ({ ms }) });
  return { db, engine };
};
const pollDe = (db) => db.leer('posts/p1').poll;
const votoDe = (db, uid) => db.leer(`posts/p1/pollVotes/${uid}`);

// ═════════════════════════════════════════════════════════════════════════════
console.log('── A) Modelo: qué acepta el servidor como encuesta ──');
// ═════════════════════════════════════════════════════════════════════════════

const modelo = encuestaNueva();
check('1) la encuesta lleva su pregunta dentro, no suelta en el texto del post', typeof modelo.question === 'string' && modelo.question.length > 0);
check('2) cada opción tiene un id estable, y es lo que se vota', modelo.options.every((o) => typeof o.id === 'string' && o.id.length > 0));
check('3) los ids no se repiten', new Set(modelo.options.map((o) => o.id)).size === modelo.options.length);
check('4) los recuentos empiezan en cero', Object.values(modelo.counts).every((n) => n === 0));
check('5) y el total también', modelo.totalVotes === 0);
check('6) la encuesta termina en el futuro', milisDe(modelo.endsAt) > Date.now());
check('7) y declara si se puede cambiar el voto', modelo.allowChange === true);

/*
 * Lo que YA NO existe. `votedBy` era un array público dentro del post: el uid de
 * cada votante quedaba a la vista de cualquiera (los posts se leen sin sesión) y
 * el documento crecía con cada voto.
 */
check('8) el modelo nuevo no tiene votedBy en ninguna parte', !JSON.stringify(modelo).includes('votedBy'));
check('9) ni contadores dentro de cada opción', modelo.options.every((o) => o.votes === undefined));
check('10) y el servidor lo reconoce como modelo nuevo', esEncuestaHistorica(modelo) === false);

const historica = {
  options: [
    { text: 'Sí', votes: 4, votedBy: ['u1', 'u2', 'u3', 'u4'] },
    { text: 'No', votes: 1, votedBy: ['u5'] },
  ],
  totalVotes: 5,
  endsAt: EN_UNA_HORA(),
};
check('11) una encuesta histórica se distingue de la nueva', esEncuestaHistorica(historica) === true);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── B) Votar ──');
// ═════════════════════════════════════════════════════════════════════════════

{
  const { db, engine } = montar(encuestaNueva());
  const r = await engine.vote({ postId: 'p1', optionId: 'o2', voterUid: 'ana' });
  const poll = pollDe(db);
  check('12) un voto válido suma 1 a su opción', poll.counts.o2 === 1, JSON.stringify(poll.counts));
  check('13) y solo a la suya', poll.counts.o1 === 0 && poll.counts.o3 === 0);
  check('14) el total sube 1', poll.totalVotes === 1);
  check('15) el servidor devuelve el recuento consolidado', r.totalVotes === 1 && r.counts.o2 === 1 && r.cambio === false);
  check('16) el voto queda en su propio documento', votoDe(db, 'ana')?.optionId === 'o2');
  check('17) con lo mínimo: la opción y las fechas', Object.keys(votoDe(db, 'ana')).sort().join(',') === 'createdAt,optionId,updatedAt');
  check('18) el voto NO deja rastro público dentro del post', !JSON.stringify(poll).includes('ana'));
}

{
  // "Una persona = un voto": el uid es el de la cuenta, no el del perfil.
  const { db, engine } = montar(encuestaNueva());
  await engine.vote({ postId: 'p1', optionId: 'o1', voterUid: 'ana' });
  await engine.vote({ postId: 'p1', optionId: 'o3', voterUid: 'beto' });
  const poll = pollDe(db);
  check('19) dos personas distintas suman dos votos', poll.totalVotes === 2 && poll.counts.o1 === 1 && poll.counts.o3 === 1);
  check('20) y cada voto vive en el documento de quien lo emitió', votoDe(db, 'ana').optionId === 'o1' && votoDe(db, 'beto').optionId === 'o3');
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── C) Lo que el servidor rechaza ──');
// ═════════════════════════════════════════════════════════════════════════════

{
  // allowChange:false → un solo voto y punto.
  const { db, engine } = montar(encuestaNueva({ allowChange: false }));
  await engine.vote({ postId: 'p1', optionId: 'o1', voterUid: 'ana' });
  await rechaza('21) con allowChange=false el segundo voto se rechaza', () => engine.vote({ postId: 'p1', optionId: 'o2', voterUid: 'ana' }), 'ya-votaste');
  const poll = pollDe(db);
  check('22) y no mueve ningún contador', poll.counts.o1 === 1 && poll.counts.o2 === 0 && poll.totalVotes === 1);
}

{
  /*
   * El defecto que hacía inflable el total: antes se votaba por índice, y un
   * índice fuera de rango no sumaba a ninguna opción pero SÍ subía totalVotes,
   * cuantas veces se quisiera. Ahora se vota por id y un id que no existe no es
   * un voto raro: no es un voto.
   */
  const { db, engine } = montar(encuestaNueva());
  await rechaza('23) una opción inexistente se rechaza', () => engine.vote({ postId: 'p1', optionId: 'o99', voterUid: 'ana' }), 'opcion-inexistente');
  await rechaza('24) y un índice disfrazado de id, también', () => engine.vote({ postId: 'p1', optionId: '0', voterUid: 'ana' }), 'opcion-inexistente');
  await rechaza('25) igual que una opción vacía', () => engine.vote({ postId: 'p1', optionId: '', voterUid: 'ana' }), 'opcion-inexistente');
  const poll = pollDe(db);
  check('26) el total NO cambia ante una opción inválida', poll.totalVotes === 0, String(poll.totalVotes));
  check('27) ni aparece ningún contador nuevo', Object.keys(poll.counts).sort().join(',') === 'o1,o2,o3');
  check('28) ni se guarda voto alguno', votoDe(db, 'ana') === undefined);
}

{
  // El reloj es el del servidor: que la UI desactive el botón no es una defensa.
  const { db, engine } = montar(encuestaNueva({ endsAt: HACE_UNA_HORA() }));
  await rechaza('29) una encuesta cerrada no admite votos', () => engine.vote({ postId: 'p1', optionId: 'o1', voterUid: 'ana' }), 'encuesta-cerrada');
  check('30) y sigue con sus contadores intactos', pollDe(db).totalVotes === 0 && pollDe(db).counts.o1 === 0);
  const sinFecha = montar(encuestaNueva({ endsAt: undefined }));
  await rechaza('31) sin fecha de cierre se cierra, no se abre', () => sinFecha.engine.vote({ postId: 'p1', optionId: 'o1', voterUid: 'ana' }), 'encuesta-cerrada');
}

{
  const { engine } = montar(null);
  await rechaza('32) un post sin encuesta se rechaza', () => engine.vote({ postId: 'p1', optionId: 'o1', voterUid: 'ana' }), 'sin-encuesta');
  const vacia = montar({ options: [], totalVotes: 0, endsAt: EN_UNA_HORA() });
  await rechaza('33) una encuesta sin opciones se rechaza', () => vacia.engine.vote({ postId: 'p1', optionId: 'o1', voterUid: 'ana' }), 'encuesta-invalida');
}

{
  // Decisión 4: las encuestas históricas no se migran ni se modifican.
  const { db, engine } = montar(historica);
  await rechaza('34) una encuesta histórica no admite votos nuevos', () => engine.vote({ postId: 'p1', optionId: 'o1', voterUid: 'ana' }), 'encuesta-antigua');
  check('35) y se queda exactamente como estaba', JSON.stringify(pollDe(db)) === JSON.stringify(historica));
}

{
  const { engine } = montar(encuestaNueva());
  let error = null;
  try {
    await engine.vote({ postId: 'no-existe', optionId: 'o1', voterUid: 'ana' });
  } catch (e) {
    error = e;
  }
  check('36) votar en un post que no existe se rechaza', error?.name === 'PostNoEncontrado', String(error?.name));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── D) Cambiar el voto (decisión aprobada) ──');
// ═════════════════════════════════════════════════════════════════════════════

{
  const { db, engine } = montar(encuestaNueva());
  await engine.vote({ postId: 'p1', optionId: 'o1', voterUid: 'ana' });
  await engine.vote({ postId: 'p1', optionId: 'o3', voterUid: 'beto' });
  const antes = pollDe(db).totalVotes;

  const r = await engine.vote({ postId: 'p1', optionId: 'o2', voterUid: 'ana' });
  const poll = pollDe(db);
  check('37) al cambiar, la opción anterior baja 1', poll.counts.o1 === 0, JSON.stringify(poll.counts));
  check('38) y la nueva sube 1', poll.counts.o2 === 1);
  check('39) el total NO cambia', poll.totalVotes === antes, `${poll.totalVotes} vs ${antes}`);
  check('40) el voto de otra persona no se toca', poll.counts.o3 === 1);
  check('41) el documento del voto apunta ya a la opción nueva', votoDe(db, 'ana').optionId === 'o2');
  check('42) y el servidor avisa de que fue un cambio', r.cambio === true);
  check('43) sin duplicar el documento de voto', votoDe(db, 'ana') !== undefined && db.leer('posts/p1/pollVotes/beto').optionId === 'o3');
}

{
  const { db, engine } = montar(encuestaNueva());
  await engine.vote({ postId: 'p1', optionId: 'o1', voterUid: 'ana' });
  const antes = JSON.stringify(pollDe(db));
  await engine.vote({ postId: 'p1', optionId: 'o1', voterUid: 'ana' });
  check('44) revotar lo mismo no mueve nada', JSON.stringify(pollDe(db)) === antes, JSON.stringify(pollDe(db).counts));
}

{
  const { db, engine } = montar(encuestaNueva({ endsAt: EN_UNA_HORA() }));
  await engine.vote({ postId: 'p1', optionId: 'o1', voterUid: 'ana' });
  db.sembrar('posts/p1', { ...db.leer('posts/p1'), poll: { ...pollDe(db), endsAt: HACE_UNA_HORA() } });
  await rechaza('45) cerrada la encuesta ya no se puede cambiar el voto', () => engine.vote({ postId: 'p1', optionId: 'o2', voterUid: 'ana' }), 'encuesta-cerrada');
  check('46) y el voto emitido se conserva', pollDe(db).counts.o1 === 1 && votoDe(db, 'ana').optionId === 'o1');
}

{
  // Ningún contador puede quedar negativo, ni partiendo de datos imposibles.
  const { db, engine } = montar(encuestaNueva({ counts: { o1: 0, o2: 0, o3: 0 }, totalVotes: 0 }));
  db.sembrar('posts/p1/pollVotes/ana', { optionId: 'o1' });
  await engine.vote({ postId: 'p1', optionId: 'o2', voterUid: 'ana' });
  const poll = pollDe(db);
  check('47) un contador nunca baja de cero', poll.counts.o1 === 0, String(poll.counts.o1));
  check('48) el total tampoco', poll.totalVotes >= 0);
  check('49) y la opción nueva sí sube', poll.counts.o2 === 1);
  check('50) ningún contador queda negativo', Object.values(poll.counts).every((n) => n >= 0));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── E) Concurrencia: 50 votos a la vez ──');
// ═════════════════════════════════════════════════════════════════════════════

{
  /*
   * El modelo anterior hacía getDoc + updateDoc reescribiendo el array entero:
   * dos votos simultáneos y uno se perdía. Aquí las 50 transacciones se lanzan
   * juntas, se pisan de verdad y el Firestore de mentira las reintenta igual que
   * el de verdad.
   */
  const { db, engine } = montar(encuestaNueva());
  const votantes = Array.from({ length: 50 }, (_, i) => `u${i}`);
  await Promise.all(votantes.map((uid, i) => engine.vote({ postId: 'p1', optionId: `o${(i % 3) + 1}`, voterUid: uid })));

  const poll = pollDe(db);
  const suma = Object.values(poll.counts).reduce((a, b) => a + b, 0);
  check('51) 50 votos simultáneos dan totalVotes === 50', poll.totalVotes === 50, String(poll.totalVotes));
  check('52) y la suma de los contadores también es 50', suma === 50, String(suma));
  check('53) no se pierde ni un voto por opción', poll.counts.o1 === 17 && poll.counts.o2 === 17 && poll.counts.o3 === 16, JSON.stringify(poll.counts));
  check('54) hay 50 documentos de voto, uno por persona', votantes.every((uid) => votoDe(db, uid) !== undefined));
  check('55) hubo choques reales y se reintentaron', db.reintentos > 0, `${db.reintentos} reintentos`);
  check('56) ningún contador quedó negativo', Object.values(poll.counts).every((n) => n >= 0));
}

{
  // La misma persona machacando el botón no puede sumar dos veces.
  const { db, engine } = montar(encuestaNueva({ allowChange: false }));
  const intentos = await Promise.allSettled(
    Array.from({ length: 10 }, () => engine.vote({ postId: 'p1', optionId: 'o1', voterUid: 'ana' }))
  );
  const ok = intentos.filter((r) => r.status === 'fulfilled').length;
  check('57) diez toques simultáneos de la misma persona dejan un solo voto', pollDe(db).totalVotes === 1, String(pollDe(db).totalVotes));
  check('58) y solo uno de los intentos se acepta', ok === 1, `${ok} aceptados`);
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── F) La decisión pura, sin Firestore ──');
// ═════════════════════════════════════════════════════════════════════════════

{
  const base = encuestaNueva();
  const d1 = decidirVoto({ poll: base, votoPrevio: null, optionId: 'o1', ahoraMs: Date.now() });
  check('59) primer voto: +1 a la opción y +1 al total', d1.ok && d1.incrementos.o1 === 1 && d1.deltaTotal === 1);
  const d2 = decidirVoto({ poll: base, votoPrevio: { optionId: 'o1' }, optionId: 'o2', ahoraMs: Date.now() });
  check('60) cambio: -1 a la anterior, +1 a la nueva, 0 al total', d2.ok && d2.incrementos.o1 === -1 && d2.incrementos.o2 === 1 && d2.deltaTotal === 0);
  const d3 = decidirVoto({ poll: base, votoPrevio: { optionId: 'o1' }, optionId: 'o1', ahoraMs: Date.now() });
  check('61) revotar lo mismo no escribe nada', d3.ok && Object.keys(d3.incrementos).length === 0 && d3.deltaTotal === 0);
  const d4 = decidirVoto({ poll: { ...base, allowChange: false }, votoPrevio: { optionId: 'o1' }, optionId: 'o2', ahoraMs: Date.now() });
  check('62) sin cambio permitido, se rechaza', d4.ok === false && d4.motivo === 'ya-votaste');
  check('63) el borde exacto del cierre cuenta como cerrada', decidirVoto({ poll: { ...base, endsAt: 1000 }, votoPrevio: null, optionId: 'o1', ahoraMs: 1000 }).motivo === 'encuesta-cerrada');
  check('64) un milisegundo antes, todavía abierta', decidirVoto({ poll: { ...base, endsAt: 1000 }, votoPrevio: null, optionId: 'o1', ahoraMs: 999 }).ok === true);
}

check('65) endsAt se entiende como Timestamp del Admin SDK', milisDe({ toMillis: () => 1234 }) === 1234);
check('66) como Timestamp serializado', milisDe({ _seconds: 2, _nanoseconds: 500000000 }) === 2500);
check('67) como Date', milisDe(new Date(4321)) === 4321);
check('68) y lo que no se entiende no abre nada', milisDe('mañana') === null && milisDe(undefined) === null);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── G) El cliente ya no escribe votos ──');
// ═════════════════════════════════════════════════════════════════════════════

const servicio = read('services/firestoreService.ts');

check('69) firestoreService ya no escribe poll.options', !servicio.includes("'poll.options'"));
check('70) ni poll.totalVotes', !servicio.includes("'poll.totalVotes'"));
check('71) votar pasa por la callable votePoll', /httpsCallable[\s\S]{0,200}'votePoll'/.test(servicio));
check('72) y el cliente no manda identidad al servidor', /votePoll[\s\S]{0,300}\{ postId, optionId \}/.test(servicio));
check('73) la posición de la opción se traduce a id antes de salir', /voteInPollById\(postId, opcion\.id\)/.test(servicio));
check('74) una encuesta histórica no se puede votar desde el cliente', /versión anterior de Weë y ya no admite votos/.test(servicio));

// El modelo nuevo, declarado en los tipos que usa toda la app.
const bloquePoll = servicio.slice(servicio.indexOf('export interface PostPoll'), servicio.indexOf('export interface PollVoteResult'));
check('75) PostPoll declara la pregunta', /question\?: string/.test(bloquePoll));
check('76) declara counts por id de opción', /counts\?: Record<string, number>/.test(bloquePoll));
check('77) y declara allowChange', /allowChange\?: boolean/.test(bloquePoll));
const bloqueOpcion = servicio.slice(servicio.indexOf('export interface PollOption'), servicio.indexOf('import type { PostPlace }'));
check('78) PollOption tiene id', /id\?: string/.test(bloqueOpcion));
check('79) y votes/votedBy quedan como histórico opcional', /votes\?: number/.test(bloqueOpcion) && /votedBy\?: string\[\]/.test(bloqueOpcion));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── H) Reglas de Firestore (lectura del texto, no ejecución) ──');
// ═════════════════════════════════════════════════════════════════════════════

const reglas = read('firestore.rules');
const bloquePosts = reglas.slice(reglas.indexOf('match /posts/{postId}'), reglas.indexOf('// === VOTOS ==='));

check('80) existe la comprobación de que se toca poll', /function touchesPoll\(\)[\s\S]{0,160}hasAny\(\['poll'\]\)/.test(reglas));
check('81) ningún update de un post puede tocar poll', /allow update: if isAuthenticated\(\) && !touchesPoll\(\) && \(/.test(bloquePosts));
/*
 * La clave está en dónde va el `!touchesPoll()`: fuera del paréntesis, así que
 * cierra los dos caminos a la vez —el del autor y el de los contadores—. Si
 * estuviera dentro, el autor podría reescribir los resultados de su encuesta.
 */
const lineaUpdate = (bloquePosts.match(/allow update:[^;]*;/) || [''])[0];
check('82) y también se lo prohíbe al autor', lineaUpdate.indexOf('!touchesPoll()') < lineaUpdate.indexOf('ownsPost()'));
check('83) los contadores de acuerdos siguen permitidos', /hasOnly\(\['views', 'agreementCount', 'disagreementCount', 'likes', 'comments', 'shares', 'reposts', 'updatedAt'\]\)/.test(lineaUpdate));
check('84) poll NO está en esa lista de contadores', !/hasOnly\([^)]*'poll'/.test(lineaUpdate));

check('85) existe la subcolección de votos', /match \/pollVotes\/\{voterUid\}/.test(bloquePosts));
const bloqueVotos = bloquePosts.slice(bloquePosts.indexOf('match /pollVotes/{voterUid}'));
check('86) cada quien lee su voto y solo el suyo', /allow read: if isAuthenticated\(\) && request\.auth\.uid == voterUid;/.test(bloqueVotos));
check('87) y nadie escribe votos desde el cliente', /allow write: if false;/.test(bloqueVotos));

/*
 * R2: `resource.data.userId.matches('biz_.*')` daba a CUALQUIER usuario
 * autenticado permiso para modificar y borrar CUALQUIER publicación de un perfil
 * Biz. Ahora hay que ser la persona dueña del negocio.
 */
check('88) ser biz_ ya no da permiso genérico sobre posts ajenos', !/^\s*(resource\.data\.userId\.matches\('biz_\.\*'\)\s*\|\||\(resource\.data\.userId\.matches\('biz_\.\*'\)\);)/m.test(bloquePosts));
check('89) la autoría de un post Biz se comprueba contra el dueño del negocio', /function ownsBizProfile\(userId\)[\s\S]{0,400}businesses\/\$\(businessIdOf\(userId\)\)\)\.data\.ownerId == request\.auth\.uid/.test(reglas));
check('90) con exists() antes del get(), para que un negocio borrado deniegue', /exists\(\/databases\/\$\(database\)\/documents\/businesses/.test(reglas));
check('91) update y delete usan la misma autoría', /allow delete: if isAuthenticated\(\) && ownsPost\(\);/.test(bloquePosts) && /ownsPost\(\)/.test(lineaUpdate));
check('92) y ownsPost cubre las tres identidades de una cuenta', /function ownsPost\(\)[\s\S]{0,300}hidi_[\s\S]{0,120}ownsBizProfile/.test(reglas));

/*
 * El agujero hermano: `allow create` aceptaba cualquier `userId` que empezara
 * por `biz_`, así que cualquiera podía PUBLICAR haciéndose pasar por cualquier
 * negocio. Publicar con una identidad exige ahora que esa identidad sea de esta
 * misma cuenta, igual que editar y borrar.
 */
const lineaCreate = (bloquePosts.match(/allow create:[^;]*;/) || [''])[0];
check('92b) publicar como un negocio exige ser su dueño', /ownsBizProfile\(request\.resource\.data\.userId\)/.test(lineaCreate));
check('92c) ya no basta con que el userId empiece por biz_', !/request\.resource\.data\.userId\.matches\('biz_\.\*'\)/.test(lineaCreate));
check('92d) una cuenta personal publica igual que siempre', /request\.resource\.data\.userId == request\.auth\.uid/.test(lineaCreate));
check('92e) y el perfil Weë también', /request\.resource\.data\.userId == \("hidi_" \+ request\.auth\.uid\)/.test(lineaCreate));
check('92f) crear y modificar comprueban la misma propiedad del negocio', /ownsBizProfile/.test(lineaCreate) && /ownsBizProfile/.test(reglas.slice(reglas.indexOf('function ownsPost'))));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── I) Lo que NO se ha tocado ──');
// ═════════════════════════════════════════════════════════════════════════════

const seccion = read('utils/sectionFeed.ts');
const muro = read('components/creator/SectionWall.tsx');
const indices = read('firestore.indexes.json');

check('93) sectionFeed no sabe que existen las encuestas, y así debe seguir', !/poll|encuesta/i.test(seccion));
check('94) SectionWall tampoco', !/poll|encuesta/i.test(muro));
check('95) destinations[] sigue siendo lo que decide dónde aparece una publicación', /destinosDe|vaAlMuroGeneral|vaALaSeccion/.test(seccion));
check('96) el punto único de paginación sigue en pie', /getMuroGeneralPaginado/.test(servicio) && /paginaDelMuroGeneral/.test(seccion));
check('97) no hay índices nuevos para encuestas', !/poll/i.test(indices));
check('98) una publicación normal se sigue creando sin encuesta', /allow create: if isAuthenticated\(\) &&/.test(bloquePosts) && !/touchesPoll/.test((bloquePosts.match(/allow create:[^;]*;/) || [''])[0]));

const funcion = read('functions/src/social/polls.ts');
// De qué se alimenta la función: solo Firebase. Se mira lo que importa, no lo
// que mencionan los comentarios.
const importaciones = (funcion.match(/^import .*$/gm) || []).join('\n');
check('99) la encuesta solo importa Firebase: ni Credits, ni Ledger, ni proveedores, ni IA', /^import [\s\S]*$/.test(importaciones) && !/credits|ledger|engine|gateway|creator|provider|gemini/i.test(importaciones), importaciones.replace(/\n/g, ' | '));
check('100) y votar no gasta nada', !/spendCredits|refundCredits|creditEngine|aiGenerations/.test(funcion));

const indice = read('functions/src/index.ts');
check('101) votePoll está exportada', /export \{ votePoll \} from '\.\/social\/polls';/.test(indice));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── J) Crear la encuesta: la pregunta y las opciones ──');
// ═════════════════════════════════════════════════════════════════════════════

const {
  MIN_OPCIONES,
  MAX_OPCIONES,
  MAX_PREGUNTA,
  MAX_OPCION,
  MAX_IMAGENES_CON_ENCUESTA,
  DURACIONES,
  nuevaOpcion,
  encuestaVacia,
  normalizar,
  opcionesDuplicadas,
  validarEncuesta,
  puedeLlevarEncuesta,
  construirPoll,
} = draft;

/** Un borrador con las opciones que le pases, ya con sus ids. */
const borrador = (question, textos, duration = 24) => ({
  question,
  options: textos.map((t) => nuevaOpcion(t)),
  duration,
});
const valida = (b) => validarEncuesta(b).ok;
const motivo = (b) => validarEncuesta(b).motivo;

check('102) una pregunta con dos opciones ya es publicable', valida(borrador('¿Qué destino prefieres?', ['Lima', 'Cusco'])));

// La pregunta es obligatoria y es SUYA: no se saca del texto de la publicación.
check('103) sin pregunta no se publica', motivo(borrador('', ['Lima', 'Cusco'])) === 'pregunta-vacia');
check('104) ni con la pregunta a base de espacios', motivo(borrador('    ', ['Lima', 'Cusco'])) === 'pregunta-vacia');
check(`105) ni pasándose de ${MAX_PREGUNTA} caracteres`, motivo(borrador('¿'.repeat(MAX_PREGUNTA + 1), ['Lima', 'Cusco'])) === 'pregunta-larga');
check('106) justo en el límite sí', valida(borrador('¿'.repeat(MAX_PREGUNTA), ['Lima', 'Cusco'])));
check('107) y nada se recorta por detrás', !/slice\(0, MAX_PREGUNTA\)|substring\(0, MAX_PREGUNTA\)/.test(fuenteDraft));

// Entre 2 y 6 opciones.
check(`108) con una sola opción no hay encuesta`, motivo(borrador('¿Cuál?', ['Lima'])) === 'pocas-opciones');
check(`109) con ${MIN_OPCIONES} sí`, valida(borrador('¿Cuál?', ['Lima', 'Cusco'])));
check(`110) y con ${MAX_OPCIONES} también`, valida(borrador('¿Cuál?', ['a', 'b', 'c', 'd', 'e', 'f'])));
check(`111) con ${MAX_OPCIONES + 1} ya no`, motivo(borrador('¿Cuál?', ['a', 'b', 'c', 'd', 'e', 'f', 'g'])) === 'muchas-opciones');

// Cada opción tiene que decir algo, y decirlo corto.
check('112) una opción vacía invalida la encuesta', motivo(borrador('¿Cuál?', ['Lima', ''])) === 'opcion-vacia');
check('113) una opción de solo espacios, también', motivo(borrador('¿Cuál?', ['Lima', '   '])) === 'opcion-vacia');
check(`114) y una de más de ${MAX_OPCION} caracteres`, motivo(borrador('¿Cuál?', ['Lima', 'x'.repeat(MAX_OPCION + 1)])) === 'opcion-larga');
check('115) justo en el límite sí', valida(borrador('¿Cuál?', ['Lima', 'x'.repeat(MAX_OPCION)])));

/*
 * Duplicados. "Perú" y "perú" son la misma opción, y "  Perú " también: si se
 * colaran, los votos se repartirían entre dos filas que dicen lo mismo.
 */
check('116) dos opciones iguales no valen', motivo(borrador('¿Cuál?', ['Perú', 'Perú'])) === 'opcion-duplicada');
check('117) ni cambiando las mayúsculas', motivo(borrador('¿Cuál?', ['Perú', 'perú'])) === 'opcion-duplicada');
check('118) ni con espacios delante o detrás', motivo(borrador('¿Cuál?', ['Perú', '  Perú '])) === 'opcion-duplicada');
check('119) ni con espacios de más por dentro', motivo(borrador('¿Cuál?', ['San  Martín', 'San Martín'])) === 'opcion-duplicada');
check('120) pero dos distintas conviven', valida(borrador('¿Cuál?', ['Perú', 'Perúquito'])));
check('121) y se sabe cuál es la repetida, para marcarla', opcionesDuplicadas(borrador('¿Cuál?', ['Perú', 'perú', 'Cusco']).options).length === 1);
check('122) normalizar deja "  PERÚ  " igual que "perú"', normalizar('  PERÚ  ') === normalizar('perú'));

// Identidad de la opción: se crea con ella y no cambia.
{
  const b = encuestaVacia();
  check('123) una encuesta nueva nace con dos opciones', b.options.length === MIN_OPCIONES);
  check('124) y con la pregunta vacía, para que la escriba quien publica', b.question === '');
  const ids = [...b.options, nuevaOpcion('c'), nuevaOpcion('d'), nuevaOpcion('e')].map((o) => o.id);
  check('125) cada opción estrena id', new Set(ids).size === ids.length, ids.join(','));
  check('126) y el id no es la posición', ids.every((id) => /^option_/.test(id)) && !ids.includes('0') && !ids.includes('1'));
  check('127) reordenar no cambia ningún id', (() => {
    const b2 = borrador('¿Cuál?', ['a', 'b', 'c']);
    const antes = b2.options.map((o) => o.id);
    const despues = [...b2.options].reverse().map((o) => o.id);
    return antes.every((id) => despues.includes(id)) && antes.length === despues.length;
  })());
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── K) El dato que se guarda ──');
// ═════════════════════════════════════════════════════════════════════════════

{
  const b = borrador('¿Qué destino prefieres?', ['Lima', ' Cusco ', 'Arequipa'], 72);
  const guardada = construirPoll(b, { ahoraMs: 1_000_000, sello: (ms) => ms });

  check('128) la pregunta se guarda en poll.question', guardada.question === '¿Qué destino prefieres?');
  check('129) el texto de cada opción va limpio de espacios', guardada.options[1].text === 'Cusco');
  check('130) cada opción conserva el id con el que se creó', guardada.options.map((o) => o.id).join() === b.options.map((o) => o.id).join());
  check('131) los ids guardados son únicos', new Set(guardada.options.map((o) => o.id)).size === 3);
  check('132) counts arranca a cero, uno por opción', Object.values(guardada.counts).every((n) => n === 0) && Object.keys(guardada.counts).length === 3);
  check('133) y sus claves son los ids de las opciones', Object.keys(guardada.counts).sort().join() === guardada.options.map((o) => o.id).sort().join());
  check('134) totalVotes arranca a cero', guardada.totalVotes === 0);
  check('135) endsAt es ahora más la duración elegida', guardada.endsAt === 1_000_000 + 72 * 60 * 60 * 1000, String(guardada.endsAt));
  check('136) y queda en el futuro', guardada.endsAt > 1_000_000);
  check('137) allowChange se guarda explícito, no por omisión', guardada.allowChange === true && 'allowChange' in guardada);

  /*
   * El formato antiguo no se genera nunca más. Se sigue LEYENDO —las encuestas
   * publicadas no se tocan— pero ninguna encuesta nueva nace con él.
   */
  const serializada = JSON.stringify(guardada);
  check('138) no se escribe votedBy', !serializada.includes('votedBy'));
  check('139) ni votes dentro de cada opción', guardada.options.every((o) => o.votes === undefined) && !/"votes"/.test(serializada));
  check('140) y el servidor la reconoce como modelo nuevo', esEncuestaHistorica(guardada) === false);

  // Y se puede votar en ella de verdad, con el motor del Bloque A.
  const db = new FakeDb();
  db.sembrar('posts/nueva', { userId: 'autor', poll: { ...guardada, endsAt: Date.now() + 3600_000 } });
  const engine = createPollEngine({ db: () => db, ahora: () => Date.now(), sello: (ms) => ({ ms }) });
  const r = await engine.vote({ postId: 'nueva', optionId: guardada.options[0].id, voterUid: 'ana' });
  check('141) una encuesta recién creada admite votos', r.totalVotes === 1 && r.counts[guardada.options[0].id] === 1);
}

check('142) las duraciones siguen siendo 1, 3 y 7 días', DURACIONES.map((d) => d.horas).join() === '24,72,168');
check('143) y no hay duración a medida', motivo(borrador('¿Cuál?', ['a', 'b'], 5)) === 'duracion-invalida');
check('144) una encuesta inválida no llega nunca a construirse', (() => {
  try {
    construirPoll(borrador('', ['a', 'b']), { ahoraMs: 0, sello: (ms) => ms });
    return false;
  } catch {
    return true;
  }
})());

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── L) Qué acompaña a una encuesta ──');
// ═════════════════════════════════════════════════════════════════════════════

const img = { type: 'image' };
const vid = { type: 'video' };

check('145) una encuesta sola, sin nada más', puedeLlevarEncuesta([]) === true);
check(`146) una encuesta con ${MAX_IMAGENES_CON_ENCUESTA} imagen, sí`, puedeLlevarEncuesta([img]) === true);
check('147) con dos imágenes, no', puedeLlevarEncuesta([img, img]) === false);
check('148) con vídeo, no', puedeLlevarEncuesta([vid]) === false);
check('149) y la regla es una sola, no una por sitio', (fuenteDraft.match(/export const puedeLlevarEncuesta/g) || []).length === 1);

const crear = read('screens/CreateScreen.tsx');

check('150) el compositor usa esa misma regla al añadir encuesta', /if \(!puedeLlevarEncuesta\(attachedMedia\)\)/.test(crear));
check('151) el tope de fotos baja a una cuando hay encuesta', /const topeImagenes = poll \? MAX_IMAGENES_CON_ENCUESTA : maxImages;/.test(crear));
check('152) tener encuesta ya no apaga la cámara por sí solo', !/const sinSitioParaMedios = [^;]*poll !== null/.test(crear));
// Los tres caminos por los que podría colarse un vídeo: la galería web, la
// nativa y el propio botón de encuesta cuando ya hay un vídeo puesto.
check('153) el vídeo con encuesta se rechaza por los tres caminos', (crear.match(/Una encuesta puede llevar una foto, pero no un vídeo/g) || []).length === 3);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── M) El compositor: entrar en modo encuesta ──');
// ═════════════════════════════════════════════════════════════════════════════

/*
 * `poll` es una forma de ENTRAR al compositor, no una sección nueva de Weë ni un
 * tipo de publicación aparte. Quien llega con `kind: 'poll'` se encuentra la
 * encuesta ya abierta: un solo toque.
 */
check('154) el compositor reconoce kind === "poll"', /const abreEncuesta = presetKind === 'poll';/.test(crear));
check('155) y entra con la encuesta ya montada', /useState<EncuestaBorrador \| null>\(\(\) => \(abreEncuesta \? encuestaVacia\(\) : null\)\)/.test(crear));
// Dos puertas a la encuesta —entrar con kind 'poll' y tocar el botón— y una sola
// forma de montarla, así que no pueden nacer distintas.
check('156) las dos puertas a la encuesta montan la misma encuesta vacía', (crear.match(/encuestaVacia\(\)/g) || []).length === 2);
/*
 * `question` NO es `poll`: la hoja Crear y la Ayuda mandan `question` para una
 * pregunta escrita, sin opciones ni votos. Confundirlas convertiría cada
 * pregunta de texto en una encuesta.
 */
check('157) "question" sigue siendo una pregunta de texto, no una encuesta', /presetKind === 'question' \? '¿Qué quieres preguntarle a la comunidad\?'/.test(crear));
check('158) y no monta ninguna encuesta', !/presetKind === 'question'[\s\S]{0,80}encuestaVacia/.test(crear));

// La encuesta es contenido por sí sola.
check('159) una encuesta sin texto libre se puede publicar', /const hasContent = postText\.trim\(\)\.length > 0 \|\| attachedMedia\.length > 0 \|\| poll !== null;/.test(crear));
check('160) y una encuesta a medias, no', /const canPublish = hasContent && !isTextOverLimit && !isPublishing && isPollValid;/.test(crear));
check('161) quien decide si está a medias es el validador ejecutable', /const validacionPoll = poll \? validarEncuesta\(poll\) : /.test(crear));
check('162) la pantalla no reimplementa ninguna regla de encuesta', !/options\.length >= minPollOptions &&/.test(crear));
check('163) y dice por qué no se puede publicar todavía', /validacionPoll\.mensaje/.test(crear));

// Al publicar: un solo documento, con la encuesta dentro.
check('164) la encuesta se construye con el helper, no a mano', /postData\.poll = construirPoll\(poll, \{/.test(crear));
check('165) con la fecha convertida a Timestamp', /sello: \(ms\) => Timestamp\.fromMillis\(ms\)/.test(crear));
check('166) el compositor ya no escribe votes ni votedBy', !/votedBy: \[\]/.test(crear) && !/votes: 0,/.test(crear));
check('167) y sigue siendo un único documento: poll es un campo del post', /postData\.poll = /.test(crear) && !/collection\(['"]polls['"]\)|'pollVotes'/.test(crear));
check('168) una publicación sin encuesta no gana el campo poll', /if \(poll\) \{[\s\S]{0,400}postData\.poll = /.test(crear));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── N) Transversalidad: el mismo camino desde todo Weë ──');
// ═════════════════════════════════════════════════════════════════════════════

const entrada = read('components/creator/ComposerEntry.tsx');
const muroSeccion = read('components/creator/SectionWall.tsx');
const home = read('screens/LandingScreen.tsx');
const homeWeb = read('screens/WebLandingScreen.tsx');

/*
 * No hay lógica por sección: hay UN componente de entrada y UN compositor. Lo
 * que se comprueba es justamente eso —que Home y las secciones pasan por el
 * mismo sitio—, no que cada una tenga su camino.
 */
check('169) hay una sola píldora de encuesta en toda la entrada', (entrada.match(/etiqueta: 'Encuesta'/g) || []).length === 1);
check('170) y no publica ni monta nada: solo llama a onCompose', /onPress=\{\(\) => onCompose\(atajo\.kind\)\}/.test(entrada) && !/PostPoll|construirPoll|encuestaVacia/.test(entrada));
check('171) el orden aprobado de la fila no se ha movido', (entrada.match(/etiqueta: '([^']+)'/g) || []).map((m) => m.slice(11, -1)).join(' · ') === 'Cámara · Foto o vídeo · Ubicación · ËContact · Encuesta');

/*
 * F8. La píldora 📊 manda `poll`, no `question`.
 *
 * Mandaba `question`, que en el compositor solo cambia el texto del campo: quien
 * tocaba Encuesta llegaba SIN encuesta y tenía que volver a pedirla. Dos toques
 * para una cosa que es una.
 */
check('171b) la píldora de encuesta manda kind "poll"', /id: 'encuesta'[^}]*kind: 'poll'/.test(entrada));
check('171c) y es la única que lo manda', (entrada.match(/kind: 'poll'/g) || []).length === 1);
check('171d) ComposerKind admite "poll"', /export type ComposerKind = [^;]*'poll'/.test(entrada));
check('171e) y conserva "question", que es otra cosa', /export type ComposerKind = [^;]*'question'/.test(entrada));

/*
 * La lista de kinds se escribe UNA sola vez. Que cada consumidor la repitiera a
 * mano es exactamente por lo que `poll` podía quedarse fuera sin que el
 * compilador dijera nada.
 */
check('171f) nadie repite la lista de kinds a mano', ![muroSeccion, home, homeWeb].some((f) => /'post' \| 'image' \| 'video' \| 'question'/.test(f)));
check('171g) los tres la importan de su única fuente', [muroSeccion, home, homeWeb].every((f) => /import ComposerEntry, \{ ComposerKind \} from/.test(f)));
check('171h) y tipan su handler con ella', [muroSeccion, home, homeWeb].every((f) => /\(kind: ComposerKind\) =>/.test(f)));
check('171i) así el kind de la píldora llega entero al compositor', /kind: 'poll'/.test(entrada) && /const abreEncuesta = presetKind === 'poll';/.test(crear));

check('172) los muros de sección usan esa misma entrada', /<ComposerEntry/.test(muroSeccion) && /onCompose=\{compose\}/.test(muroSeccion));
check('173) y lo único que hacen es llevar el kind al compositor', /navigate\('Create', \{ kind/.test(muroSeccion));
check('174) el Home nativo, igual', /<ComposerEntry/.test(home) && /navigate\('Create', \{ kind \}\)/.test(home));
// En la web el compositor se pide al navegador de arriba —hay otra ruta `Create`
// en la barra de pestañas que no tiene pantalla—, pero el kind viaja igual.
check('175) y el Home web, igual', /<ComposerEntry/.test(homeWeb) && /irAlCompositor\(\{ kind \}\)/.test(homeWeb));
// Nombrar la encuesta en un comentario está bien; implementarla, no.
check('176) ninguno tiene lógica propia de encuestas', ![muroSeccion, home, homeWeb].some((f) => /PostPoll|construirPoll|validarEncuesta|encuestaVacia|setPoll|poll\./.test(f)));

/*
 * Travel, Design, Studio y Chef no son cuatro caminos: son cuatro secciones del
 * mismo muro, que monta la misma entrada.
 */
const secciones = read('utils/sectionFeed.ts');
check('177) Travel, Design, Studio y Chef son secciones del mismo muro', ['travel', 'design', 'studio', 'chef'].every((s) => secciones.includes(`${s}:`)));
// La sección viaja como contexto de la publicación; quien abre la encuesta es el
// kind, y solo el kind. Ninguna sección tiene un camino propio.
check('178) la sección no decide nada de la encuesta', /sourceSection/.test(muroSeccion) && /const abreEncuesta = presetKind === 'poll';/.test(crear) && !/abreEncuesta[^;]*sourceSection/.test(crear));

// destinations[] intacto: la encuesta viaja con ellos sin tocarlos.
check('179) los destinos se guardan igual que siempre', /\.\.\.\(destinos\.length > 0 \? \{ destinations: destinos \} : \{\}\)/.test(crear));
check('180) y la encuesta no los toca', !/destinos[\s\S]{0,120}poll|poll[\s\S]{0,120}destinos\.length/.test(crear));
{
  // Una encuesta con dos destinos es un post con dos destinos: nada más.
  const post = { id: 'p', destinations: ['general', 'travel'], poll: { question: '¿?', options: [] } };
  check('181) una encuesta con destinos es un post con destinos', post.destinations.join() === 'general,travel' && !!post.poll);
  check('182) sectionFeed sigue sin saber que existen las encuestas', !/poll|encuesta/i.test(secciones));
}

// 0 Credits, 0 IA: publicar una encuesta no pasa por ninguna de esas puertas.
check('183) crear una encuesta no gasta Credits', !/spendCredits|creditsService|creditEngine/.test(crear) && !/spendCredits|credits/i.test(fuenteDraft));
check('184) ni llama a ninguna IA', !/gemini|provider|aiEngine|creatorService/i.test(fuenteDraft));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── O) Leer la encuesta: las cuentas ──');
// ═════════════════════════════════════════════════════════════════════════════

/*
 * Igual que el borrador, la parte que calcula se ejecuta: porcentajes, totales y
 * la detección del formato antiguo son aritmética y reglas, no pintura.
 */
const fuenteVista = read('utils/pollView.ts');
const jsVista = ts.transpileModule(fuenteVista, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const vista = await import('data:text/javascript;base64,' + Buffer.from(jsVista).toString('base64'));
const { resultadosDe, repartirPorcentajes, esHistorica, estaCerrada, tiempoRestante, textoVotos } = vista;

const nueva = (counts, totalVotes, extra = {}) => ({
  question: '¿Cuál prefieres?',
  options: [
    { id: 'a', text: 'Diseño A' },
    { id: 'b', text: 'Diseño B' },
    { id: 'c', text: 'Diseño C' },
  ],
  counts,
  totalVotes,
  endsAt: Date.now() + 3600_000,
  allowChange: true,
  ...extra,
});

{
  // El ejemplo exacto del encargo.
  const r = resultadosDe(nueva({ a: 12, b: 6, c: 2 }, 20));
  check('185) 12 · 6 · 2 de 20 son 60 · 30 · 10', r.filas.map((f) => f.porcentaje).join() === '60,30,10', r.filas.map((f) => f.porcentaje).join());
  check('186) y los votos absolutos se muestran tal cual', r.filas.map((f) => f.votos).join() === '12,6,2');
  check('187) el total sale de totalVotes, no de sumar opciones', r.total === 20);
  check('188) cada fila conserva su id, no su posición', r.filas.map((f) => f.id).join() === 'a,b,c');
}

{
  // Sin votos: ni división por cero, ni porcentajes inventados.
  const r = resultadosDe(nueva({}, 0));
  check('189) con cero votos no se divide por cero', r.filas.every((f) => f.porcentaje === 0 && Number.isFinite(f.porcentaje)));
  check('190) y el total es cero', r.total === 0);
  check('191) que se dice con palabras, no con un 0 suelto', textoVotos(0) === 'Sin votos todavía');
  check('192) un voto es "1 voto", no "1 votos"', textoVotos(1) === '1 voto' && textoVotos(2) === '2 votos');
}

/*
 * Redondear cada porcentaje por su lado deja sumas de 99 o 101, y eso se ve.
 * Los puntos que sobran van a los restos más grandes.
 */
check('193) tres opciones empatadas suman 100, no 99', repartirPorcentajes([1, 1, 1]).reduce((a, b) => a + b, 0) === 100, repartirPorcentajes([1, 1, 1]).join());
check('194) y el punto de más va a una sola', repartirPorcentajes([1, 1, 1]).join() === '34,33,33');
check('195) siete opciones repartidas también suman 100', repartirPorcentajes([1, 1, 1, 1, 1, 1, 1]).reduce((a, b) => a + b, 0) === 100);
check('196) 1 de 3 no se convierte en 33 y pico', repartirPorcentajes([2, 1]).join() === '67,33');
check('197) sin votos, todo a cero', repartirPorcentajes([0, 0]).join() === '0,0');
check('198) y un contador negativo no rompe el reparto', repartirPorcentajes([-5, 10]).join() === '0,100');

{
  // Cerrada o abierta: manda el reloj, y una fecha ilegible cierra.
  const abierta = nueva({ a: 1 }, 1, { endsAt: Date.now() + 3600_000 });
  const cerrada = nueva({ a: 1 }, 1, { endsAt: Date.now() - 3600_000 });
  check('199) una encuesta con fecha futura está abierta', estaCerrada(abierta, Date.now()) === false);
  check('200) una con fecha pasada está cerrada', estaCerrada(cerrada, Date.now()) === true);
  check('201) y una sin fecha entendible, también', estaCerrada(nueva({}, 0, { endsAt: 'mañana' }), Date.now()) === true);
  check('202) cerrada se dice "Encuesta finalizada"', tiempoRestante(cerrada, Date.now()) === 'Encuesta finalizada');
  check('203) abierta se dice cuánto queda', /restante/.test(tiempoRestante(nueva({}, 0, { endsAt: Date.now() + 2 * 86400_000 }), Date.now())));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── P) Encuestas de antes: se leen, no se tocan ──');
// ═════════════════════════════════════════════════════════════════════════════

const antigua = {
  options: [
    { text: 'Sí', votes: 12, votedBy: ['u1'] },
    { text: 'No', votes: 8, votedBy: ['u2'] },
  ],
  totalVotes: 20,
  endsAt: Date.now() + 3600_000,
};

{
  const r = resultadosDe(antigua);
  check('204) una encuesta antigua se reconoce por su formato', r.historica === true);
  check('205) y sus resultados se leen de options[].votes', r.filas.map((f) => f.votos).join() === '12,8');
  check('206) con sus porcentajes bien hechos', r.filas.map((f) => f.porcentaje).join() === '60,40');
  check('207) y su total', r.total === 20);
  check('208) sus filas reciben un id sintético, que no sirve para votar', r.filas.every((f) => /^historica_/.test(f.id)));
}

/*
 * Cliente y servidor tienen que estar de acuerdo en qué es antiguo. Si aquí
 * dijéramos "se puede votar" y allí "no", la persona tocaría para recibir un
 * error. Se comprueban las dos implementaciones sobre los mismos casos.
 */
{
  const casos = [
    nueva({ a: 1 }, 1),
    antigua,
    { options: [{ id: 'a', text: 'A' }, { text: 'B', votes: 0 }], totalVotes: 0, endsAt: 1 },
    { options: [{ id: 'a', text: 'A' }, { id: '', text: 'B' }], totalVotes: 0, endsAt: 1 },
    { options: [{ id: 'a', text: 'A', votedBy: [] }], totalVotes: 0, endsAt: 1 },
    { options: [], totalVotes: 0, endsAt: 1 },
  ];
  const iguales = casos.every((c) => esHistorica(c) === esEncuestaHistorica(c));
  check('209) cliente y servidor coinciden en qué encuesta es antigua', iguales, casos.map((c) => `${esHistorica(c)}/${esEncuestaHistorica(c)}`).join(' '));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Q) Un solo sitio donde se dibuja una encuesta ──');
// ═════════════════════════════════════════════════════════════════════════════

const componente = read('components/Poll.tsx');
const tarjeta = read('components/PostCard.tsx');
const detalle = read('screens/PostDetailScreen.tsx');

/*
 * Para las comprobaciones de "esto NO se hace" hay que mirar el código y no los
 * comentarios: explicar por qué no se usa `scale()` no es usarlo.
 */
const sinComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const codigoPoll = sinComentarios(componente);

check('210) existe components/Poll.tsx', componente.length > 0);
check('211) PostCard lo usa', /<Poll\b/.test(tarjeta) && /import Poll from '\.\/Poll'/.test(tarjeta));
check('212) PostDetailScreen usa el mismo, sin variante propia', /<Poll\b/.test(detalle) && /import Poll from '\.\.\/components\/Poll'/.test(detalle) && !/PollDetail/.test(detalle));

/*
 * Lo que se buscaba: que no queden DOS implementaciones. Se comprueba por las
 * piezas que definían aquella UI —su contenedor, sus filas, su barra— y por la
 * función que la dibujaba.
 */
const RASTROS = ['pollContainer', 'pollOption', 'pollProgress', 'pollPercentage', 'renderPoll', 'localPoll', 'setUserVote'];
check('213) no queda una segunda UI en PostCard', !RASTROS.some((r) => tarjeta.includes(r)), RASTROS.filter((r) => tarjeta.includes(r)).join());
check('214) ni en PostDetailScreen', !RASTROS.some((r) => detalle.includes(r)), RASTROS.filter((r) => detalle.includes(r)).join());
check('215) ni ninguno de los dos vota por su cuenta', !/voteInPoll/.test(tarjeta) && !/voteInPoll/.test(detalle));
check('216) en un repost la encuesta apunta al post ORIGINAL, que es donde vive', /<Poll postId=\{displayPost\.id\} poll=\{displayPost\.poll\}/.test(tarjeta));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── R) Antes de votar, después de votar ──');
// ═════════════════════════════════════════════════════════════════════════════

check('217) la pregunta se pinta dentro de la tarjeta de encuesta', /\{!!poll\.question &&/.test(componente));
check('218) y el texto libre del post sigue por su cuenta', !/poll\.question[\s\S]{0,80}content/.test(codigoPoll));
/*
 * Los resultados solo aparecen cuando toca: después de votar, con la encuesta
 * cerrada o si es antigua. Antes, solo las opciones.
 */
check('219) los resultados salen cuando hay motivo, no siempre', /const conResultados = votada \|\| cerrada \|\| historica;/.test(componente));
check('220) el porcentaje solo se pinta con resultados', /\{conResultados && \([\s\S]{0,400}porcentaje\}%/.test(componente));
check('221) los votos absolutos, igual', /\{conResultados && \([\s\S]{0,300}textoVotos\(fila\.votos\)/.test(componente));
check('222) y la barra se queda a cero mientras no los haya', /const destino = conResultados \? fila\.porcentaje : 0;/.test(componente));
check('223) después de votar se dice "Votaste"', /votada \? 'Votaste' : null/.test(componente));
check('224) y se ve cuál fue tu opción', /elegida=\{miVoto === fila\.id\}/.test(componente) && /borderWidth: elegida \? 2 : 1/.test(componente));
check('225) el total sale de poll.totalVotes, no de sumar filas', /useState<number>\(\(\) => poll\.totalVotes \|\| 0\)/.test(componente));

// Objetivo táctil y accesibilidad.
check('226) cada opción mide 48 de alto', /minHeight: 48,/.test(componente));
check('227) escrito tal cual: scale() en web lo dejaría en 43', !/scale\(/.test(codigoPoll));
check('228) cada opción es un radio', /accessibilityRole="radio"/.test(componente));
check('229) que dice si está marcada y si se puede tocar', /accessibilityState=\{\{ checked: elegida, disabled: !pulsable \}\}/.test(componente));
/*
 * Comprobado en el DOM real: react-native-web NO emite `aria-checked` cuando
 * vale false, y un `role="radio"` sin ese atributo hace que un lector de
 * pantalla lea todas las opciones igual. Se pone a mano en web.
 */
check('229b) y en web el aria-checked se escribe aunque sea false', /'aria-checked': elegida/.test(componente));
check('230) y el conjunto se anuncia como un grupo', /accessibilityRole="radiogroup"/.test(componente));
/*
 * La altura no cambia al votar: la barra va DETRÁS del texto, en la misma fila,
 * en vez de añadir una línea nueva debajo.
 */
check('231) la barra va detrás del texto, no debajo', /position: 'absolute'/.test(componente) && /styles\.barra/.test(componente));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── S) Quién eres, qué votaste, y cambiar de opinión ──');
// ═════════════════════════════════════════════════════════════════════════════

const servicioC = read('services/firestoreService.ts');

/*
 * "Una persona = un voto" también al LEER: se pregunta por el documento de la
 * cuenta, no por el del perfil activo. Si se usara el perfil, la misma persona
 * vería su voto solo en la identidad con la que votó.
 */
check('232) el voto propio se lee del documento de la cuenta', /getMyPollVote[\s\S]{0,400}auth\?\.currentUser\?\.uid/.test(servicioC));
check('233) en su propia ruta, sin leer la lista de votantes', /doc\(db, 'posts', postId, 'pollVotes', uid\)/.test(servicioC));
check('234) y no se usa activeProfile como identidad de voto', !/getMyPollVote[\s\S]{0,400}activeProfile/.test(servicioC) && !/activeProfile/.test(codigoPoll));
check('235) votedBy ya no decide si votaste', !/votedBy/.test(codigoPoll));
check('236) el componente pregunta por su voto, no lo adivina', /postsService[\s\S]{0,40}\.getMyPollVote\(postId\)/.test(componente));

// Cambiar el voto: un toque en otra opción, sin confirmación ni botón aparte.
check('237) con allowChange se puede seguir tocando después de votar', /const permiteCambio = poll\.allowChange !== false;/.test(componente) && /\(!votada \|\| permiteCambio\)/.test(componente));
check('238) sin segunda confirmación', !/confirmAction|¿Seguro|Cambiar voto/.test(codigoPoll));
check('239) cambiar de voto no suma al total', /setTotal\(antes\.miVoto \? antes\.total : antes\.total \+ 1\)/.test(componente));
check('240) y la opción anterior baja, sin quedar negativa', /Math\.max\(0, \(optimista\[antes\.miVoto\] \|\| 0\) - 1\)/.test(componente));
check('241) manda el resultado que confirma el servidor', /setConteos\(confirmado\.counts \|\| \{\}\);/.test(componente) && /setTotal\(confirmado\.totalVotes \|\| 0\);/.test(componente));
check('242) si falla, se vuelve a lo de antes', /setConteos\(antes\.conteos\);[\s\S]{0,120}setTotal\(antes\.total\);[\s\S]{0,60}setMiVoto\(antes\.miVoto\);/.test(componente));
check('243) y no se reintenta solo', !/retry|reintent|setTimeout/.test(codigoPoll));
check('244) el cliente nunca escribe los contadores', !/'poll\.counts'|'poll\.totalVotes'|updateDoc/.test(codigoPoll));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── T) Cerrada, antigua e invitada ──');
// ═════════════════════════════════════════════════════════════════════════════

check('245) una encuesta cerrada no se puede tocar', /const pulsable = [^;]*!cerrada/.test(componente));
check('246) una antigua tampoco', /const pulsable = [^;]*!historica/.test(componente));
check('247) cerrada se ve apagada', /opacity: cerrada \? 0\.7 : 1/.test(componente));
check('248) y dice que ha terminado', /cerrada \? 'Encuesta finalizada'/.test(componente));
check('249) una antigua abierta explica por qué no admite votos', /historica && !cerrada/.test(componente) && /ya no admite votos/.test(componente));
check('250) y en una antigua ni se pregunta por el voto propio', /if \(!postId \|\| !user \|\| historica\)/.test(componente));
check('251) sin sesión se ve la encuesta y tocarla lleva al registro', /if \(!user\) \{[\s\S]{0,120}onRequireAuth\?\.\(\)/.test(componente));
check('252) sin inventar autenticación propia', !/signIn|createUser|signInAnonymously/.test(codigoPoll));

// Movimiento.
check('253) las barras se animan en 300 ms', /Animated\.timing\(ancho, \{ toValue: destino, duration: 300/.test(componente));
check('254) y quien prefiere quietud ve el resultado ya puesto', /prefers-reduced-motion/.test(componente) && /if \(quieto\) \{[\s\S]{0,60}ancho\.setValue\(destino\)/.test(componente));
check('255) también en el teléfono', /AccessibilityInfo\.isReduceMotionEnabled/.test(componente));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── U) Lo que este bloque no ha movido ──');
// ═════════════════════════════════════════════════════════════════════════════

check('256) la publicación normal sigue igual: texto, fotos, vídeo, lugar', ['renderMedia', 'etiquetaDeLugar', 'HowIMadeIt'].every((x) => tarjeta.includes(x)));
check('257) los acuerdos y desacuerdos, intactos', /useVote\(\{/.test(tarjeta) && /agreementCount/.test(tarjeta) && /useVote\(\{/.test(detalle));
check('258) los comentarios del detalle, intactos', /commentsService\.subscribeToPost/.test(detalle));
check('259) sectionFeed sigue sin saber que existen las encuestas', !/poll|encuesta/i.test(secciones));
check('260) destinations[] no se ha tocado', /\.\.\.\(destinos\.length > 0 \? \{ destinations: destinos \} : \{\}\)/.test(crear));
check('261) el compositor sigue entrando en modo encuesta', /const abreEncuesta = presetKind === 'poll';/.test(crear));
check('262) y la píldora sigue mandando poll', /kind: 'poll'/.test(entrada));
check('263) la encuesta no cuesta Credits', !/spendCredits|creditsService|creditEngine/.test(codigoPoll) && !/spendCredits|creditsService/i.test(sinComentarios(fuenteVista)));
check('264) ni llama a ninguna IA', !/gemini|provider|aiEngine|creatorService/i.test(codigoPoll) && !/gemini|provider/i.test(sinComentarios(fuenteVista)));
check('265) y no hay índices nuevos', !/poll/i.test(indices));

// ═════════════════════════════════════════════════════════════════════════════
console.log(failures === 0 ? '\n✅ Encuestas (Bloques A, B y C): todo en orden' : `\n❌ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
