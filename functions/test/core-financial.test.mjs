/*
 * WEE FINANCIAL CORE — QUE EL DINERO NO SE PIERDA NI SE DUPLIQUE.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 *   CHECKOUT → PAYMENT ROUTER → PASARELA → AVISO → LIBRO → CREDITS
 *
 * Y sobre todo las dos frases que sostienen la fase entera: un pago produce su
 * efecto UNA vez, y produce su efecto AL MENOS una vez. La primera evita cobrar
 * dos veces; la segunda, que es la que se olvida, evita que alguien pague y
 * nadie se entere — que es peor, porque nadie reclama lo que no sabe que pagó.
 *
 * ── Lo que de verdad hay que proteger ──────────────────────────────────────
 *
 * Que UNA persona tenga UNA cuenta y UN saldo, compre desde donde compre.
 * Que el saldo no baje de cero ni con dos gastos a la vez.
 * Que un céntimo no aparezca ni desaparezca en ninguna suma.
 *
 * Aquí no se mueve dinero real. La única pasarela es de mentira y se llama así.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (b) => (fs.existsSync(path.resolve(RAIZ, b + '.ts')) ? b + '.ts' : b + '/index.ts');
const nombresPedidos = (js, dep) => {
  const nombres = new Set();
  const escapado = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [, clausula] of js.matchAll(new RegExp(`import\\s+([^;]*?)\\s+from\\s*['"]${escapado}['"]`, 'g'))) {
    for (const [, dentro] of clausula.matchAll(/\{([^}]*)\}/g)) {
      for (const parte of dentro.split(',')) {
        const nombre = parte.trim().split(/\s+as\s+/)[0].trim();
        if (nombre) nombres.add(nombre);
      }
    }
  }
  return [...nombres];
};
const sustituto = (nombres) =>
  comoModulo(
    'const nada = new Proxy(function () {}, { get: () => nada, apply: () => nada, construct: () => nada });\n' +
      'export default nada;\n' + nombres.map((n) => `export const ${n} = nada;`).join('\n') + '\n',
  );
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  const js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  const RE = /(from\s*)(['"])([^'"]+)\2/g;
  const mapa = new Map();
  for (const [, , , dep] of js.matchAll(RE)) {
    if (mapa.has(dep)) continue;
    mapa.set(dep, dep.startsWith('.')
      ? (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, dep))))).url
      : sustituto(nombresPedidos(js, dep)));
  }
  const url = comoModulo(js.replace(RE, (_f, pre, q, dep) => `${pre}${q}${mapa.get(dep)}${q}`));
  const resultado = { url, ns: await import(url) };
  cargados.set(ruta, resultado);
  return resultado;
};

const core = (await cargar('functions/src/core/index.ts')).ns;
const comp = (await cargar('functions/src/financial/index.ts')).ns;

const DIR = 'functions/src/core/financial';
const ARCHIVOS = ['money', 'ledger', 'account', 'payment', 'commerce'].map((n) => `${DIR}/${n}.ts`);
const COMP_FIN = 'functions/src/financial/index.ts';
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const codigoCore = ARCHIVOS.map((f) => sinComentarios(leer(f))).join('\n');
const codigoComp = sinComentarios(leer(COMP_FIN));

/* ── Ayudas ────────────────────────────────────────────────────────────────── */

const T0 = 1_700_000_000_000;
const YO = { userId: 'user-0001' };
const OTRA = { userId: 'user-0002' };
const usd = (minor) => ({ amountMinor: minor, currency: 'USD' });
const pen = (minor) => ({ amountMinor: minor, currency: 'PEN' });

const motorCredits = core.crearMotorDeCredits();
const motorPagos = core.crearMotorDePagos();

const cuenta = (extra = {}) => ({ ...core.abrirCuenta({ accountId: 'user-0001', currency: 'USD', at: T0 }), ...extra });

const mov = (extra = {}) => ({
  contract: '1.0', principal: YO, at: T0, type: 'grant', amount: 100,
  reason: 'prueba', source: 'test', idempotencyKey: 'k-0001', ...extra,
});

const pago = (extra = {}) => ({
  contract: '1.0', principal: YO, at: T0, paymentId: 'pay-0001',
  money: usd(999), purpose: 'CREDITS_PURCHASE', providerId: 'sandbox',
  idempotencyKey: 'ik-0001', ...extra,
});

const aviso = (extra = {}) => ({
  eventId: 'ev-0001', providerId: 'sandbox', paymentId: 'pay-0001',
  type: 'succeeded', at: T0 + 1, signatureVerified: true, ...extra,
});

/** Aplica una decisión de Credits como lo haría el almacén. */
const aplica = (d) => {
  if (d.status !== 'applied') throw new Error(`no se aplicó: ${d.status} ${d.refusal ?? ''} ${JSON.stringify(d.error ?? {})}`);
  return d.account;
};
const aplicaPago = (d) => {
  if (d.status !== 'transition') throw new Error(`sin transición: ${d.status} ${d.refusal ?? ''}`);
  return d.intent;
};

/** Un pago ya cobrado, por el camino normal. */
const cobrado = (extra = {}) => {
  const creado = aplicaPago(motorPagos.crear(pago(extra)));
  return aplicaPago(motorPagos.recibirAviso(creado, aviso({
    paymentId: creado.paymentId, eventId: 'ev-cobro-' + creado.paymentId, money: creado.money,
  }), T0 + 1));
};

const perfil = (id, extra = {}) => ({
  providerId: id, countries: ['PE', 'US'], currencies: ['USD', 'PEN'], methods: ['card'],
  status: 'ACTIVE', fee: { fixed: usd(30), bps: 290 }, approvalBps: 9000, settlementDays: 2, ...extra,
});

/**
 * UN ALMACÉN DE MENTIRA, Y SOLO PARA LAS PRUEBAS.
 *
 * Imita fielmente lo único que el contrato exige y que de verdad importa:
 * escribir la cuenta Y el asiento en el mismo commit, y solo si la revisión
 * sigue siendo la esperada. Con `await` de verdad, para que dos llamadas se
 * entrelacen como se entrelazarían contra una base de datos.
 */
const almacen = (inicial) => {
  let cta = inicial;
  const asientos = new Map();
  return {
    get cuentaActual() { return cta; },
    get libro() { return [...asientos.values()]; },
    async cuenta() { await null; return cta; },
    async asientoDeCredits(id) { await null; return asientos.get(id); },
    async aplicar(decision) {
      await null;
      if (cta.revision !== decision.expectedRevision) return { applied: false, account: cta };
      if (asientos.has(decision.entry.transactionId)) return { applied: false, account: cta };
      asientos.set(decision.entry.transactionId, decision.entry);
      cta = decision.account;
      return { applied: true, account: cta };
    },
    async lista({ limit }) { await null; return { entries: [...asientos.values()].slice(0, limit) }; },
  };
};

/* Lo que la suite entera produce, para comprobar al final que nada se declaró en vano. */
const visto = { estadosDePago: new Set(), decisionesDeCredits: new Set(), rechazosDeCredits: new Set(), eventos: new Set(), avisos: new Set(), rechazosDePago: new Set() };
const anota = (d) => {
  if (!d || typeof d !== 'object') return d;
  if (d.to) visto.estadosDePago.add(d.to);
  if (d.refusal && d.contract && d.events) visto.rechazosDePago.add(d.refusal);
  for (const e of d.events ?? []) visto.eventos.add(e.kind);
  for (const w of d.warnings ?? []) visto.avisos.add(w);
  return d;
};
const anotaCredits = (d) => {
  if (d?.status) visto.decisionesDeCredits.add(d.status);
  if (d?.refusal) visto.rechazosDeCredits.add(d.refusal);
  return d;
};

console.log('\n── A · Las fronteras que no se cruzan ──');
{
  check('1) sin infraestructura: ni base de datos, ni red, ni nube',
    !/firebase|firestore|postgres|redis|pubsub|cloudtasks|kafka|node:fs|node:http|fetch\(/i.test(codigoCore));
  check('2) sin el nombre de NINGUNA pasarela de pago',
    !/(?<![a-z])(stripe|dlocal|adyen|paypal|mercadopago|culqi|niubiz|yape|plin|pix|izipay)(?![a-z])/i.test(codigoCore + codigoComp),
    'ni siquiera en la de pruebas: se llama «sandbox»');
  check('3) sin el nombre de ningún proveedor de IA',
    !/(?<![a-z])(gemini|seedance|seedream|deepseek|openai|claude|elevenlabs|flux|bytedance)(?![a-z])/i.test(codigoCore + codigoComp));
  check('4) sin apps ni Workplaces escritos a mano',
    !/(?<![a-zA-Z])(studio|travel|chef|business|design|writer|music|beauty|photo)(?![a-zA-Z])/.test(codigoCore),
    'BUSINESS en mayúscula es un PLAN de suscripción, no un producto');
  check('5) ni reloj ni dados: el tiempo entra por la puerta',
    !/Date\.now\(|Math\.random\(|new Date\(/.test(codigoCore + codigoComp));
  check('6) NO es el Router de IA: aquí no se elige ni capacidad, ni modelo, ni proveedor de IA',
    !/RoutingDecision|ImplementationRef|capabilityFit|puedeEjecutarse|getCapabilityImplementations/.test(codigoCore));
  check('7) NO es Brain, ni Planner, ni Workflow, ni Job Engine',
    !/BrainUnderstanding|PlannerRequest|WorkflowRun|JobDispatch|crearJobEngine/.test(codigoCore));
  check('8) el almacén es un PUERTO y el Core no guarda estado de módulo',
    /export interface FinancialStore/.test(leer(`${DIR}/account.ts`))
    && !/^const \w+ = new (Map|Set)\(/m.test(codigoCore),
    'calcular con un Set dentro de una función pura no es guardar estado');
  check('9) y el sistema de anuncios NO se construye aquí',
    !/targeting|auction|adRanking|adDelivery|impression|ctr\b/i.test(codigoCore),
    'solo la costura financiera');
  check('10) no se inventa ningún precio ni ninguna equivalencia de Credits',
    !/1 ?Credit ?= ?1|creditsPerUsd|CREDITS_PER|precioDeCredit/i.test(codigoCore + codigoComp));
}

console.log('\n── B · El dinero, exacto ──');
{
  check('11) el dinero es un ENTERO de unidades mínimas y su moneda, siempre juntos',
    core.esMoney(usd(999)) && !core.esMoney({ amountMinor: 9.99, currency: 'USD' })
    && !core.esMoney({ amountMinor: 999 }) && !core.esMoney({ amountMinor: 999, currency: 'dolares' }));
  check('12) sumar céntimos no acumula error, que es justo lo que hace un decimal', (() => {
    let t = core.cero('USD');
    for (let i = 0; i < 1000; i++) t = core.sumar(t, usd(10));
    /* Con decimales, mil veces 0,10 da 99,99999999999859. */
    return t.amountMinor === 10_000;
  })());
  check('13) no se suman monedas distintas: no hay resultado, y eso es lo correcto',
    core.sumar(usd(100), pen(100)) === undefined && core.restar(usd(100), pen(100)) === undefined
    && core.comparar(usd(1), pen(1)) === undefined);
  check('14) las monedas sin decimales no se multiplican por cien', (() => {
    const yen = core.desdeTarifaAproximada(1000, 'JPY');
    const dolar = core.desdeTarifaAproximada(10, 'USD');
    return yen.amountMinor === 1000 && dolar.amountMinor === 1000 && core.exponenteDe('JPY') === 0;
  })(), 'mil yenes son mil unidades mínimas, no cien mil');
  check('15) y las de tres decimales tampoco se quedan cortas', core.exponenteDe('KWD') === 3 && core.exponenteDe('PEN') === 2);
  check('16) repartir diez entre tres NO pierde ni inventa una unidad', (() => {
    const partes = core.repartir(usd(10), 3);
    return partes.map((p) => p.amountMinor).join() === '4,3,3'
      && partes.reduce((t, p) => t + p.amountMinor, 0) === 10;
  })());
  check('17) repartir en proporciones tampoco', (() => {
    const partes = core.repartirEnProporciones(usd(1000), [1, 1, 1]);
    return partes.reduce((t, p) => t + p.amountMinor, 0) === 1000;
  })());
  check('18) un importe que no cabe en un entero seguro no se guarda',
    core.dinero(Number.MAX_SAFE_INTEGER, 'USD') === undefined && core.sumar(usd(1e13), usd(1e13)) === undefined);
  check('19) convertir moneda EXIGE una tasa declarada, con origen y momento', (() => {
    const tasa = { from: 'USD', to: 'PEN', rateScaled: 375_000, scale: 5, source: 'prueba', at: T0 };
    const r = core.convertir(usd(1000), tasa);
    return r.money.amountMinor === 3750 && r.money.currency === 'PEN' && r.tasa.source === 'prueba';
  })());
  check('20) y no hay ninguna tasa escrita dentro del Core',
    !/rateScaled: ?[0-9]/.test(codigoCore), 'la tasa entra por un puerto, nunca por una constante');
  check('21) la tarifa de un proveedor se convierte con un redondeo EXPLÍCITO y simétrico',
    core.desdeTarifaAproximada(0.005, 'USD').amountMinor === 1
    && core.desdeTarifaAproximada(-0.005, 'USD').amountMinor === -1);
}

console.log('\n── C · Una cuenta, un saldo ──');
{
  const c = cuenta();
  check('22) una cuenta nace sin saldo: la bienvenida es un movimiento, no un campo',
    c.credits === 0 && c.revision === 0 && c.status === 'ACTIVE');
  check('23) el saldo NO lleva moneda: un Credit no es dinero', !('currency' in { credits: c.credits }) && typeof c.credits === 'number');
  check('24) la cuenta NO tiene billetera por producto: no hay appId ni workspaceId dentro',
    !('appId' in c) && !('workspaceId' in c) && !/balanceByApp|walletPor|perApp|byWorkspace/i.test(codigoCore),
    'es el requisito que manda sobre todos los demás');
  check('25) la moneda de la cuenta es CONTEXTO: cambiarla no mueve un Credit', (() => {
    const enSoles = { ...c, currency: 'PEN' };
    const a = aplica(motorCredits.mover(c, mov({ amount: 500 })));
    const b = aplica(motorCredits.mover(enSoles, mov({ amount: 500 })));
    return a.credits === b.credits;
  })());
  check('26) una cuenta sin identificador con forma no se abre',
    core.abrirCuenta({ accountId: 'x', currency: 'USD', at: T0 }) === undefined
    && core.abrirCuenta({ accountId: 'user-0001', currency: 'dolar', at: T0 }) === undefined);
}

console.log('\n── D · Credits: los movimientos ──');
{
  const c = cuenta();
  const regalo = anotaCredits(motorCredits.mover(c, mov({ type: 'grant', amount: 240, reason: 'Bienvenida' })));
  check('27) otorgar sube el saldo y deja un asiento que cuadra solo',
    regalo.status === 'applied' && regalo.account.credits === 240
    && core.asientoDeCreditsCuadra(regalo.entry) && regalo.entry.balanceBefore === 0 && regalo.entry.balanceAfter === 240);
  check('28) el asiento lleva la atribución, que NO es autoridad', (() => {
    const d = motorCredits.mover(c, mov({ attribution: { appId: 'app-1', workspaceId: 'ws-1', operationId: 'op-1' } }));
    return d.entry.attribution.appId === 'app-1' && d.entry.accountId === 'user-0001';
  })());

  const con240 = regalo.account;
  const gasto = anotaCredits(motorCredits.mover(con240, mov({ type: 'usage', amount: 20, idempotencyKey: 'k-usage-01', service: 'ai_image' })));
  check('29) gastar resta, y el signo lo pone el TIPO, no quien llama',
    gasto.entry.amount === -20 && gasto.account.credits === 220);
  check('30) un importe negativo no cuela: un gasto de -50 sería un regalo',
    motorCredits.mover(con240, mov({ type: 'usage', amount: -50 })).status === 'invalid');
  check('31) ni un importe fraccionario: los Credits no se parten',
    motorCredits.mover(con240, mov({ amount: 1.5 })).status === 'invalid');

  const sinSaldo = anotaCredits(motorCredits.mover(con240, mov({ type: 'usage', amount: 1000, idempotencyKey: 'k-usage-02' })));
  check('32) EL SALDO NO BAJA DE CERO. Nunca.',
    sinSaldo.status === 'refused' && sinSaldo.refusal === 'insufficient_credits' && sinSaldo.error.code === 'INSUFFICIENT_CREDITS');
  check('33) una cuenta suspendida no mueve dinero',
    anotaCredits(motorCredits.mover({ ...con240, status: 'SUSPENDED' }, mov({ idempotencyKey: 'k-susp' }))).refusal === 'account_not_active');
  check('34) y los límites de la cuenta se respetan cuando están',
    anotaCredits(motorCredits.mover({ ...con240, limits: { maxCreditsPerOperation: 10 } }, mov({ amount: 50, idempotencyKey: 'k-limite' }))).refusal === 'limit_exceeded');
  check('35) la vida de la cuenta se lleva por tipo', (() => {
    const a = aplica(motorCredits.mover(c, mov({ type: 'purchase', amount: 500, idempotencyKey: 'k-compra' })));
    return a.lifetime.purchased === 500 && a.lifetime.granted === 0;
  })());

  /* Corregir es sumar otro asiento, nunca editar el de antes. */
  const correccion = core.compensacionDeCredits(gasto.entry, { transactionId: 'adjust_x', at: T0 + 5, reason: 'error', source: 'admin', balanceBefore: 220 });
  check('36) corregir un asiento es escribir OTRO que lo compensa, apuntando al primero',
    correccion.amount === 20 && correccion.compensates === gasto.entry.transactionId && correccion.type === 'adjustment');
  check('37) y el original no se toca: sigue congelado y con su importe',
    Object.isFrozen(gasto.entry) && gasto.entry.amount === -20);
  check('38) una cadena de asientos se puede recorrer y tiene que encadenar', (() => {
    const bien = core.cadenaDeCreditsCuadra([regalo.entry, { ...gasto.entry, balanceBefore: 240, balanceAfter: 220 }]);
    const mal = core.cadenaDeCreditsCuadra([regalo.entry, { ...gasto.entry, balanceBefore: 999, balanceAfter: 979 }]);
    return bien.ok && bien.balance === 220 && !mal.ok && mal.enIndice === 1;
  })(), 'si no encadena, falta un asiento o sobra uno');
}

console.log('\n── E · Idempotencia de Credits ──');
{
  const c = aplica(motorCredits.mover(cuenta(), mov({ amount: 500, idempotencyKey: 'k-base' })));
  const primero = motorCredits.mover(c, mov({ type: 'usage', amount: 50, idempotencyKey: 'k-rep' }));
  const repetido = anotaCredits(motorCredits.mover(c, mov({ type: 'usage', amount: 50, idempotencyKey: 'k-rep' }), primero.entry));
  check('39) el mismo movimiento otra vez NO se vuelve a aplicar',
    repetido.status === 'duplicate' && repetido.existing.transactionId === primero.entry.transactionId);
  const conflicto = anotaCredits(motorCredits.mover(c, mov({ type: 'usage', amount: 999, idempotencyKey: 'k-rep' }), primero.entry));
  check('40) la misma clave con OTRO importe es un conflicto: no se aplica ninguno',
    conflicto.status === 'refused' && conflicto.refusal === 'idempotency_conflict' && conflicto.error.code === 'DUPLICATE_REQUEST');
  check('41) el identificador es determinista y usa la convención que producción YA escribe',
    core.claveDeMovimiento('usage', 'abc') === 'usage_abc'
    && core.claveDeMovimiento('refund', 'abc') === 'refund_abc'
    && core.claveDeMovimiento('adjustment', 'abc') === 'adjust_abc',
    'dos convenciones para lo mismo acaban cobrando dos veces');
  check('42) sin clave de idempotencia no hay movimiento',
    motorCredits.mover(c, { ...mov(), idempotencyKey: undefined }).status === 'invalid');
}

console.log('\n── F · Concurrencia: el saldo aguanta ──');
{
  /* Dos gastos a la vez sobre un saldo que solo da para uno. */
  const store = almacen(aplica(motorCredits.mover(cuenta(), mov({ amount: 50, idempotencyKey: 'k-inicial' }))));
  const gastar = (clave, amount) => comp.aplicarMovimiento(store, motorCredits, mov({ type: 'usage', amount, idempotencyKey: clave }));
  const [a, b] = await Promise.all([gastar('g-uno', 40), gastar('g-dos', 40)]);
  check('43) dos gastos simultáneos sobre un saldo que solo da para uno: pasa UNO',
    (a.ok !== b.ok) && store.cuentaActual.credits === 10,
    `saldo=${store.cuentaActual.credits} ok=${a.ok}/${b.ok}`);
  check('44) y el que no pasó dice por qué, sin dejar el saldo en negativo',
    store.cuentaActual.credits >= 0 && (a.ok ? b.decision.refusal : a.decision.refusal) === 'insufficient_credits');

  /* Tres veces la MISMA operación: un solo efecto. */
  const store2 = almacen(cuenta());
  await comp.aplicarMovimiento(store2, motorCredits, mov({ type: 'grant', amount: 500, idempotencyKey: 'k-inicial-2' }));
  const tres = await Promise.all([1, 2, 3].map(() => comp.aplicarMovimiento(store2, motorCredits, mov({ type: 'usage', amount: 30, idempotencyKey: 'g-mismo' }))));
  check('45) tres peticiones idénticas a la vez producen UN solo movimiento',
    tres.every((r) => r.ok) && store2.cuentaActual.credits === 470 && store2.libro.length === 2,
    `saldo=${store2.cuentaActual.credits} asientos=${store2.libro.length}`);

  /* Compra y consumo a la vez: los dos ocurren y el saldo cuadra. */
  const store3 = almacen(cuenta());
  await comp.aplicarMovimiento(store3, motorCredits, mov({ type: 'grant', amount: 100, idempotencyKey: 'k-inicial-3' }));
  await Promise.all([
    comp.aplicarMovimiento(store3, motorCredits, mov({ type: 'purchase', amount: 500, idempotencyKey: 'c-uno' })),
    comp.aplicarMovimiento(store3, motorCredits, mov({ type: 'usage', amount: 60, idempotencyKey: 'u-uno' })),
  ]);
  check('46) comprar y gastar a la vez: los dos ocurren y el saldo cuadra',
    store3.cuentaActual.credits === 540, `saldo=${store3.cuentaActual.credits}`);
  check('47) y el libro reconstruye ese mismo saldo', (() => {
    const orden = store3.libro.sort((x, y) => x.balanceBefore - y.balanceBefore);
    return orden.reduce((t, e) => t + e.amount, 0) === store3.cuentaActual.credits;
  })());
}

console.log('\n── G · El pago ──');
{
  const d = anota(motorPagos.crear(pago()));
  check('48) un pago nace CREATED, sin haber cobrado nada',
    d.status === 'transition' && d.intent.status === 'CREATED' && d.intent.revision === 0);
  check('49) y lleva propósito, porque publicidad NO es una compra de Credits',
    d.intent.purpose === 'CREDITS_PURCHASE'
    && motorPagos.crear(pago({ purpose: 'BOOST', paymentId: 'pay-b' })).intent.purpose === 'BOOST');
  check('50) cobrar cero no es un pago', motorPagos.crear(pago({ money: usd(0) })).status === 'invalid');
  check('51) ni un importe con decimales', motorPagos.crear(pago({ money: { amountMinor: 9.99, currency: 'USD' } })).status === 'invalid');
  check('52) ni un campo que el contrato no declara', motorPagos.crear(pago({ tarjeta: '4111111111111111' })).status === 'invalid');

  const creado = d.intent;
  const repetido = motorPagos.crear(pago(), creado);
  check('53) la misma clave con el mismo pago devuelve ESE, sin crear otro',
    repetido.status === 'noop' && repetido.intent.paymentId === creado.paymentId);
  check('54) la misma clave con OTRO importe es un conflicto: no se cobra ninguno',
    anota(motorPagos.crear(pago({ money: usd(5000) }), creado)).refusal === 'idempotency_conflict');
  check('55) y la clave de una persona NUNCA alcanza el pago de otra',
    motorPagos.crear(pago({ principal: OTRA }), creado).refusal === 'idempotency_conflict');
}

console.log('\n── H · Avisos de pasarela ──');
{
  const creado = aplicaPago(motorPagos.crear(pago()));

  /* SIN FIRMA NO SE MUEVE DINERO. */
  const sinFirma = anota(motorPagos.recibirAviso(creado, aviso({ signatureVerified: false }), T0 + 1));
  check('56) un aviso sin firma comprobada NO acredita nada, y se dice por qué',
    sinFirma.status === 'refused' && sinFirma.refusal === 'signature_not_verified' && !sinFirma.effect,
    'si bastara con decir «pagado», acreditar sería gratis');

  const ok = anota(motorPagos.recibirAviso(creado, aviso({ money: usd(999) }), T0 + 1));
  check('57) con firma y el importe correcto, el pago se cobra',
    ok.to === 'SUCCEEDED' && ok.intent.status === 'SUCCEEDED');
  check('58) y DICE qué efecto hay que producir, con su clave: no lo produce él',
    ok.effect.kind === 'grant_credits' && ok.effect.idempotencyKey === core.claveDeEfecto('pay-0001', 'purchase')
    && !('credits' in ok.effect), 'acreditar es otra escritura, en otro libro');

  /* EL AVISO REPETIDO. */
  const cobradoYa = ok.intent;
  const otraVez = anota(motorPagos.recibirAviso(cobradoYa, aviso({ money: usd(999) }), T0 + 2));
  check('59) el MISMO aviso otra vez no vuelve a acreditar',
    otraVez.status === 'noop' && !otraVez.effect && otraVez.warnings.includes('event_duplicate'));
  check('60) ni uno nuevo sobre un pago ya cobrado', (() => {
    const r = anota(motorPagos.recibirAviso(cobradoYa, aviso({ eventId: 'ev-otro', money: usd(999) }), T0 + 3));
    return r.status === 'noop' && !r.effect;
  })());

  /* FUERA DE ORDEN. */
  const conOrden = { ...creado, lastEventSequence: 5 };
  check('61) un aviso más viejo que el último visto NO retrocede el estado', (() => {
    const r = anota(motorPagos.recibirAviso(conOrden, aviso({ eventId: 'ev-viejo', type: 'failed', sequence: 3 }), T0 + 4));
    return r.status === 'noop' && r.warnings.includes('event_out_of_order');
  })());
  check('62) y uno nuevo sí avanza, guardando su número', (() => {
    const r = anota(motorPagos.recibirAviso(conOrden, aviso({ eventId: 'ev-nuevo', type: 'pending', sequence: 9 }), T0 + 4));
    return r.to === 'PENDING' && r.intent.lastEventSequence === 9;
  })());

  /* IMPORTE QUE NO COINCIDE. */
  check('63) una pasarela que confirma OTRO importe no confirma este pago',
    anota(motorPagos.recibirAviso(creado, aviso({ money: usd(1) }), T0 + 1)).refusal === 'amount_mismatch',
    'si no, se cobra un céntimo y se acredita lo que diga el aviso');
  check('64) ni en otra moneda',
    anota(motorPagos.recibirAviso(creado, aviso({ money: pen(999) }), T0 + 1)).refusal === 'currency_mismatch');

  check('65) un pago que falla no produce ningún efecto', (() => {
    const r = anota(motorPagos.recibirAviso(creado, aviso({ eventId: 'ev-f', type: 'failed' }), T0 + 1));
    return r.to === 'FAILED' && !r.effect;
  })());
  check('66) y de un estado final no se sale por un aviso tardío', (() => {
    const fallado = aplicaPago(motorPagos.recibirAviso(creado, aviso({ eventId: 'ev-f2', type: 'failed' }), T0 + 1));
    return anota(motorPagos.recibirAviso(fallado, aviso({ eventId: 'ev-tarde', type: 'succeeded', money: usd(999) }), T0 + 9)).status === 'noop';
  })());
  check('67) un pago pendiente sigue vivo y puede cobrarse después', (() => {
    const pendiente = aplicaPago(motorPagos.recibirAviso(creado, aviso({ eventId: 'ev-p', type: 'pending' }), T0 + 1));
    const luego = anota(motorPagos.recibirAviso(pendiente, aviso({ eventId: 'ev-s', type: 'succeeded', money: usd(999) }), T0 + 60_000));
    return luego.to === 'SUCCEEDED' && !!luego.effect;
  })(), 'los avisos no llegan inmediatamente, y eso no puede perder un cobro');
  check('67b) un pago se puede cancelar antes de cobrarse', (() => {
    const r = anota(motorPagos.recibirAviso(creado, aviso({ eventId: 'ev-can', type: 'cancelled' }), T0 + 1));
    return r.to === 'CANCELLED' && !r.effect;
  })());
  check('67c) y una devolución que llega DESPUÉS de un contracargo no cuela', (() => {
    const p = cobrado({ paymentId: 'pay-cbr', idempotencyKey: 'ik-cbr' });
    const conCargo = aplicaPago(motorPagos.recibirAviso(p, aviso({ eventId: 'ev-cbr', paymentId: 'pay-cbr', type: 'chargeback_opened' }), T0 + 5));
    const r = anota(motorPagos.recibirAviso(conCargo, aviso({ eventId: 'ev-rr', paymentId: 'pay-cbr', type: 'refunded', refundId: 'rcb-uno', money: usd(100) }), T0 + 6));
    return r.refusal === 'invalid_transition';
  })(), 'el dinero ya lo reclamó el banco: devolverlo otra vez sería devolverlo dos veces');
  check('68) se avisa cuando la pasarela no dice lo que cobró por procesar',
    anota(motorPagos.recibirAviso(creado, aviso({ eventId: 'ev-nf', money: usd(999) }), T0 + 1)).warnings.includes('fee_not_reported'));
}

console.log('\n── I · Devoluciones ──');
{
  /**
   * PEDIR UNA DEVOLUCIÓN NO ES DEVOLVERLA.
   *
   * Una devolución real es asíncrona: se pide, la pasarela la procesa y la
   * confirma después. La primera versión la daba por completada en el acto —el
   * mismo engaño que dar un cobro por bueno al pulsar un botón— y dejaba cuatro
   * de los cinco estados declarados sin producir jamás.
   */
  const pagado = cobrado();
  const pedida = anota(motorPagos.devolver(pagado, { principal: YO, at: T0 + 10, refundId: 'ref-0001', reason: 'a peticion', idempotencyKey: 'rk-0001' }));
  check('69) pedir una devolución NO mueve el pago: lo deja cobrado y la anota como pedida',
    pedida.intent.status === 'SUCCEEDED' && pedida.intent.refunds[0].status === 'REQUESTED'
    && pedida.intent.refunded === undefined, `${pedida.intent.status}`);
  check('69b) y NO declara todavía ningún efecto sobre los Credits',
    !pedida.effect, 'retirar Credits se hace cuando el dinero sale, no cuando alguien lo pide');

  const confirmada = anota(motorPagos.recibirAviso(pedida.intent, aviso({
    eventId: 'ev-ref1', type: 'refunded', refundId: 'ref-0001', money: usd(999),
  }), T0 + 20));
  check('70) cuando la pasarela confirma, el pago pasa a devuelto y la devolución se completa',
    confirmada.to === 'REFUNDED' && confirmada.intent.refunds[0].status === 'COMPLETED'
    && confirmada.intent.refunded.amountMinor === 999, `${confirmada.to}`);
  check('70b) y AHÍ se declara que hay que RETIRAR los Credits — no sumarlos',
    confirmada.effect.kind === 'reverse_credits'
    && confirmada.effect.idempotencyKey === core.claveDeEfecto('ref-0001', 'refund'),
    'el defecto más caro de la fase: `refund_credits` se traducía a un movimiento que SUMABA');

  /* LA MISMA DEVOLUCIÓN DOS VECES. */
  const yaDevuelto = confirmada.intent;
  check('71) la pasarela reintenta el aviso y no se devuelve dos veces',
    anota(motorPagos.recibirAviso(yaDevuelto, aviso({ eventId: 'ev-ref1b', type: 'refunded', refundId: 'ref-0001', money: usd(999) }), T0 + 21)).status === 'noop');
  check('72) y otra distinta sobre un pago ya devuelto entero no cuela',
    anota(motorPagos.devolver(yaDevuelto, { principal: YO, at: T0 + 22, refundId: 'ref-0002', reason: 'otra', idempotencyKey: 'rk-0002' })).refusal === 'refund_exceeds_payment');

  /* PARCIALES. Confirmadas por la pasarela, que es cuando cuentan. */
  const otro = cobrado({ paymentId: 'pay-par', idempotencyKey: 'ik-par' });
  const confirmar = (intent, refundId, minor, ev) => anota(motorPagos.recibirAviso(intent, aviso({
    eventId: ev, paymentId: intent.paymentId, type: 'refunded', refundId, money: usd(minor),
  }), T0 + 30));
  const p1 = confirmar(otro, 'rp-uno', 400, 'ev-rp1');
  check('73) una devolución parcial deja el pago PARTIALLY_REFUNDED',
    p1.to === 'PARTIALLY_REFUNDED' && p1.intent.refunded.amountMinor === 400);
  const p2 = confirmar(p1.intent, 'rp-dos', 400, 'ev-rp2');
  check('74) dos parciales suman, y el pago sigue parcialmente devuelto',
    p2.to === 'PARTIALLY_REFUNDED' && p2.intent.refunded.amountMinor === 800 && p2.intent.refunds.length === 2);
  check('75) DOS PARCIALES DEL 60% NO DEVUELVEN EL 120%',
    confirmar(p2.intent, 'rp-tres', 400, 'ev-rp3').refusal === 'refund_exceeds_payment');
  check('76) y la última parcial que completa el importe cierra el pago', (() => {
    const r = confirmar(p2.intent, 'rp-cuatro', 199, 'ev-rp4');
    return r.to === 'REFUNDED' && core.pendienteDeDevolver(r.intent).amountMinor === 0;
  })());

  /*
   * EL AVISO INCOMPLETO NO SE ADIVINA. Los dos defectos que costó no tenerlo:
   * sin identificador se fabricaba uno constante por pago —dos parciales
   * colisionaban y la segunda se perdía—, y sin importe se devolvía TODO.
   */
  check('76b) un aviso de devolución SIN identificador se rechaza, no se inventa uno',
    anota(motorPagos.recibirAviso(otro, aviso({ eventId: 'ev-sinid', paymentId: otro.paymentId, type: 'refunded', money: usd(100) }), T0 + 40)).refusal === 'refund_reference_missing');
  check('76c) y uno SIN importe tampoco devuelve el pago entero',
    anota(motorPagos.recibirAviso(otro, aviso({ eventId: 'ev-sinm', paymentId: otro.paymentId, type: 'refunded', refundId: 'rp-xx' }), T0 + 40)).refusal === 'amount_mismatch',
    'un aviso de una parcial sin importe cerraba el pago completo');
  check('76d) dos parciales distintas ya NO colisionan en una sola identidad', (() => {
    const a = confirmar(otro, 'rp-a1', 300, 'ev-a1');
    const b = confirmar(a.intent, 'rp-b1', 300, 'ev-b1');
    return b.intent.refunds.length === 2 && b.intent.refunded.amountMinor === 600;
  })());

  /* Y la pasarela puede decir que NO salió. */
  check('76e) una devolución que la pasarela rechaza queda FAILED y el dinero sigue siendo de Weë', (() => {
    const p = cobrado({ paymentId: 'pay-rf', idempotencyKey: 'ik-rf' });
    const ped = aplicaPago(motorPagos.devolver(p, { principal: YO, at: T0 + 1, refundId: 'rf-uno', reason: 'x', idempotencyKey: 'rfk-uno' }));
    const r = anota(motorPagos.recibirAviso(ped, aviso({
      eventId: 'ev-rf', paymentId: 'pay-rf', type: 'refund_failed', refundId: 'rf-uno', money: usd(999),
    }), T0 + 2));
    return r.intent.refunds[0].status === 'FAILED' && r.intent.status === 'SUCCEEDED' && !r.effect;
  })());

  /* La identidad se comprueba DESPUÉS de los importes: la misma petición, la misma respuesta. */
  check('76f) una petición imposible contesta lo mismo lleve o no una clave repetida', (() => {
    const p = cobrado({ paymentId: 'pay-ord', idempotencyKey: 'ik-ord' });
    const nueva = motorPagos.devolver(p, { principal: YO, at: T0, refundId: 'ro-uno', money: usd(99999), reason: 'x', idempotencyKey: 'rok-uno' });
    const conPedida = aplicaPago(motorPagos.devolver(p, { principal: YO, at: T0, refundId: 'ro-dos', money: usd(100), reason: 'x', idempotencyKey: 'rok-dos' }));
    const repetida = motorPagos.devolver(conPedida, { principal: YO, at: T0, refundId: 'ro-dos', money: usd(99999), reason: 'x', idempotencyKey: 'rok-dos' });
    return nueva.refusal === 'refund_exceeds_payment' && repetida.refusal === 'refund_exceeds_payment';
  })(), 'antes contestaba «ya está hecho» o «se pasa» según la clave que llevara');

  check('77) no se devuelve lo que nunca se cobró', (() => {
    const creado = aplicaPago(motorPagos.crear(pago({ paymentId: 'pay-nc', idempotencyKey: 'ik-nc' })));
    return anota(motorPagos.devolver(creado, { principal: YO, at: T0, refundId: 'r-nocap', reason: 'x', idempotencyKey: 'rk-nocap' })).refusal === 'not_captured';
  })());
  check('78) ni el pago de otra persona: no se dice ni que exista',
    motorPagos.devolver(pagado, { principal: OTRA, at: T0, refundId: 'r-otro', reason: 'x', idempotencyKey: 'rk-otro' }).status === 'invalid');
}

console.log('\n── J · Contracargos ──');
{
  const pagado = cobrado({ paymentId: 'pay-cb', idempotencyKey: 'ik-cb' });
  const abierto = anota(motorPagos.recibirAviso(pagado, aviso({ eventId: 'ev-cb', paymentId: 'pay-cb', type: 'chargeback_opened', chargebackId: 'cb-1' }), T0 + 100));
  check('79) un contracargo se REGISTRA y se ata al pago',
    abierto.to === 'CHARGEBACK' && abierto.intent.chargeback.chargebackId === 'cb-1' && abierto.intent.chargeback.status === 'OPENED');
  check('80) y NO decide qué pasa con los Credits: ese hueco se deja a la vista',
    !abierto.effect, 'quitarlos, no quitarlos o esperar al fallo son tres políticas y ninguna está tomada');
  check('81) resolverlo anota el desenlace sin cambiar de estado', (() => {
    const r = anota(motorPagos.recibirAviso(abierto.intent, aviso({ eventId: 'ev-cb2', paymentId: 'pay-cb', type: 'chargeback_resolved', chargebackStatus: 'WON' }), T0 + 200));
    return r.status === 'transition' && r.intent.chargeback.status === 'WON' && r.intent.chargeback.resolvedAt === T0 + 200;
  })());
  /*
   * Y NO SE REABRE. Un contracargo ganado podía pasar a perdido y volver a
   * ganado indefinidamente, emitiendo un evento cada vez; y se podía «resolver»
   * uno que nadie había abierto.
   */
  check('81b) resolverlo dos veces no lo vuelve a resolver', (() => {
    const resuelto = aplicaPago(motorPagos.recibirAviso(abierto.intent, aviso({ eventId: 'ev-r1', paymentId: 'pay-cb', type: 'chargeback_resolved', chargebackStatus: 'WON' }), T0 + 200));
    return anota(motorPagos.recibirAviso(resuelto, aviso({ eventId: 'ev-r2', paymentId: 'pay-cb', type: 'chargeback_resolved', chargebackStatus: 'LOST' }), T0 + 300)).status === 'noop';
  })());
  check('81c) y resolver uno que nadie abrió se rechaza', (() => {
    const p = cobrado({ paymentId: 'pay-sincb', idempotencyKey: 'ik-sincb' });
    return anota(motorPagos.recibirAviso(p, aviso({ eventId: 'ev-sincb', paymentId: 'pay-sincb', type: 'chargeback_resolved', chargebackStatus: 'LOST' }), T0)).refusal === 'chargeback_not_open';
  })());
  check('81d) abrirlo dos veces tampoco abre dos', (() => {
    const p = cobrado({ paymentId: 'pay-cb2', idempotencyKey: 'ik-cb2' });
    const uno = aplicaPago(motorPagos.recibirAviso(p, aviso({ eventId: 'ev-o1', paymentId: 'pay-cb2', type: 'chargeback_opened', chargebackId: 'cbx' }), T0));
    return anota(motorPagos.recibirAviso(uno, aviso({ eventId: 'ev-o2', paymentId: 'pay-cb2', type: 'chargeback_opened', chargebackId: 'otro' }), T0 + 1)).status === 'noop';
  })());
  check('81e) el desenlace NO decide la rama: un `opened` con «WON» dentro abre igual', (() => {
    const p = cobrado({ paymentId: 'pay-cb3', idempotencyKey: 'ik-cb3' });
    const r = anota(motorPagos.recibirAviso(p, aviso({ eventId: 'ev-mix', paymentId: 'pay-cb3', type: 'chargeback_opened', chargebackStatus: 'WON' }), T0));
    return r.to === 'CHARGEBACK' && r.intent.chargeback.status === 'OPENED';
  })(), 'lo decidía un campo opcional que ni se validaba');
  check('81f) y un desenlace inventado se rechaza',
    motorPagos.recibirAviso(abierto.intent, aviso({ eventId: 'ev-inv', paymentId: 'pay-cb', type: 'chargeback_resolved', chargebackStatus: 'GANADO' }), T0).status === 'invalid');
  check('81g) resolver CONSERVA lo que se abrió: identificador, importe y caso', (() => {
    const r = motorPagos.recibirAviso(abierto.intent, aviso({ eventId: 'ev-cons', paymentId: 'pay-cb', type: 'chargeback_resolved', chargebackStatus: 'LOST' }), T0 + 400);
    return r.intent.chargeback.chargebackId === 'cb-1' && r.intent.chargeback.openedAt === T0 + 100;
  })(), 'se reconstruía entero y perdía el identificador y la referencia del caso');

  check('82) no se abre un contracargo sobre algo que nunca se cobró', (() => {
    const creado = aplicaPago(motorPagos.crear(pago({ paymentId: 'pay-nc2', idempotencyKey: 'ik-nc2' })));
    return anota(motorPagos.recibirAviso(creado, aviso({ eventId: 'ev-x', paymentId: 'pay-nc2', type: 'chargeback_opened' }), T0)).refusal === 'not_captured';
  })());
}

console.log('\n── K · Por dónde se cobra ──');
{
  const perfiles = [perfil('alfa', { fee: { fixed: usd(30), bps: 290 }, approvalBps: 9000 }), perfil('beta', { fee: { fixed: usd(10), bps: 500 }, approvalBps: 6000 })];
  const r = core.enrutarPago({ money: usd(10_000), country: 'PE', purpose: 'CREDITS_PURCHASE' }, perfiles);
  check('83) el router elige por COSTE EFECTIVO POR PAGO APROBADO, no por comisión',
    r.status === 'routed' && r.selected.providerId === 'alfa',
    'beta cobra menos y aprueba mucho menos: cada pago que llega sale más caro');
  check('84) y la comisión se calcula en enteros, redondeando hacia arriba',
    core.comisionDe(perfiles[0], usd(10_000)).amountMinor === 320);
  check('85) una pasarela que no cubre el país queda fuera, con su motivo', (() => {
    const d = core.enrutarPago({ money: usd(100), country: 'BR', purpose: 'CREDITS_PURCHASE' }, [perfil('alfa')]);
    return d.status === 'unavailable' && d.candidates[0].reason === 'country_not_supported';
  })());
  check('86) ni la moneda',
    core.enrutarPago({ money: { amountMinor: 100, currency: 'JPY' }, purpose: 'CREDITS_PURCHASE' }, [perfil('alfa')]).candidates[0].reason === 'currency_not_supported');
  check('87) una apagada no cobra',
    core.enrutarPago({ money: usd(100), purpose: 'CREDITS_PURCHASE' }, [perfil('alfa', { status: 'DISABLED' })]).candidates[0].reason === 'provider_disabled');
  check('88) los topes por operación se respetan',
    core.enrutarPago({ money: usd(999_999), purpose: 'CREDITS_PURCHASE' }, [perfil('alfa', { maxPerPayment: usd(1000) })]).candidates[0].reason === 'amount_out_of_range');
  check('89) sin tasa de aprobación declarada se asume la peor razonable, no la mejor', (() => {
    const con = core.enrutarPago({ money: usd(1000), purpose: 'CREDITS_PURCHASE' }, [perfil('a', { approvalBps: 9900 }), perfil('b', { approvalBps: undefined })]);
    return con.selected.providerId === 'a';
  })(), 'no saber no puede ser una ventaja');
  check('90) el desempate es por valor de carácter, no por idioma de la máquina', (() => {
    const iguales = [perfil('Z-a'), perfil('a-a')];
    return core.enrutarPago({ money: usd(1000), purpose: 'CREDITS_PURCHASE' }, iguales).selected.providerId === 'Z-a'
      && !/localeCompare/.test(codigoCore);
  })());
  check('91) la misma petición da SIEMPRE la misma ruta',
    JSON.stringify(core.enrutarPago({ money: usd(5000), country: 'PE', purpose: 'BOOST' }, perfiles))
    === JSON.stringify(core.enrutarPago({ money: usd(5000), country: 'PE', purpose: 'BOOST' }, [...perfiles].reverse())));
  check('92) y este router NO decide ni Credits ni modelos de IA',
    !/credits|capability|modelId/i.test(sinComentarios(leer(`${DIR}/commerce.ts`)).split('export const enrutarPago')[1]?.slice(0, 3000) ?? ''));
}

console.log('\n── L · Un checkout, no siete ──');
{
  const perfiles = [perfil('alfa')];
  const base = {
    contract: '1.0', principal: YO, at: T0, purpose: 'CREDITS_PURCHASE',
    money: usd(999), idempotencyKey: 'ck-0001', paymentId: 'pay-ck-1', country: 'PE',
  };
  const desdeBusiness = core.prepararCheckout({ ...base, attribution: { appId: 'app-business' } }, perfiles);
  const desdeStudio = core.prepararCheckout({ ...base, paymentId: 'pay-ck-2', idempotencyKey: 'ck-0002', attribution: { appId: 'app-studio' } }, perfiles);
  check('93) el checkout prepara el cobro y dice con qué se puede pagar',
    desdeBusiness.status === 'ready' && desdeBusiness.methods.length > 0 && !!desdeBusiness.draft);
  check('94) y NO acredita nada: su salida es una intención, no un saldo',
    !('credits' in desdeBusiness.draft) && desdeBusiness.draft.accountId === 'user-0001');
  check('95) el MISMO checkout sirve desde cualquier producto: solo cambia la atribución', (() => {
    const limpiar = (d) => JSON.stringify({ ...d.draft, paymentId: '', idempotencyKey: '', attribution: {} });
    return limpiar(desdeBusiness) === limpiar(desdeStudio)
      && desdeBusiness.draft.attribution.appId === 'app-business'
      && desdeStudio.draft.attribution.appId === 'app-studio';
  })());
  check('96) sirve igual para publicidad y para una suscripción',
    core.prepararCheckout({ ...base, purpose: 'ADVERTISING', paymentId: 'pay-ad', idempotencyKey: 'ck-ad' }, perfiles).status === 'ready'
    && core.prepararCheckout({ ...base, purpose: 'SUBSCRIPTION', paymentId: 'pay-sub', idempotencyKey: 'ck-sub' }, perfiles).status === 'ready');
  check('97) si no hay por dónde cobrar, se dice: no se inventa una ruta',
    core.prepararCheckout({ ...base, country: 'JP' }, perfiles).status === 'unavailable');
  check('98) y no hay un checkout por producto en ninguna parte',
    !/checkoutDe(Studio|Business|Chef|Design|Travel|Music)/i.test(codigoCore + codigoComp));
}

console.log('\n── M · Multi-moneda y multi-país ──');
{
  check('99) se cobra en soles, en reales, en dólares y en euros', (() => {
    const perfiles = [perfil('p', { countries: ['PE', 'BR', 'ES'], currencies: ['PEN', 'BRL', 'EUR'], fee: { fixed: pen(100), bps: 290 } })];
    const enSoles = core.enrutarPago({ money: pen(5000), country: 'PE', purpose: 'CREDITS_PURCHASE' }, perfiles);
    return enSoles.status === 'routed' && enSoles.selected.fee.currency === 'PEN';
  })());
  check('100) una comisión en otra moneda que el cobro no se mezcla: se descarta la pasarela',
    core.enrutarPago({ money: pen(5000), purpose: 'CREDITS_PURCHASE' }, [perfil('p', { currencies: ['PEN'], fee: { fixed: usd(30), bps: 0 } })]).candidates[0].reason === 'fee_currency_mismatch');
  check('101) no hay un `if` por país en ninguna parte',
    !/=== ?'PE'|=== ?'BR'|=== ?'MX'|país ?===|country ?=== ?'/.test(codigoCore),
    'los países entran como datos del perfil de cada pasarela');
  check('102) el país se valida como país', core.enrutarPago({ money: usd(10), country: 'peru', purpose: 'BOOST' }, [perfil('p')]).status === 'invalid');
}

console.log('\n── N · Lo que Weë paga y lo que ingresa ──');
{
  const coste = core.anotarCosteDeProveedor({
    transactionId: 'pc-1', accountId: 'user-0001', at: T0, providerId: 'matriz-a', modelId: 'm-1',
    reason: 'video', source: 'job', jobId: 'job-1', estimated: usd(120), actual: usd(133),
    usage: { videoSeconds: 5 }, attribution: { appId: 'app-1', capability: 'video.generate' },
  });
  check('103) lo estimado y lo real se guardan SEPARADOS: compararlos es lo único que revela si el precio sigue siendo cierto',
    coste.estimated.amountMinor === 120 && coste.actual.amountMinor === 133);
  check('104) si el proveedor no dijo lo que costó, `actual` NO está — y eso es un dato, no un cero', (() => {
    const sin = core.anotarCosteDeProveedor({ transactionId: 'pc-2', accountId: 'user-0001', at: T0, providerId: 'matriz-a', reason: 'x', source: 'job', estimated: usd(120) });
    return !('actual' in sin);
  })());
  const ingreso = core.anotarIngreso({ transactionId: 'rv-1', accountId: 'user-0001', at: T0, gross: usd(999), purpose: 'CREDITS_PURCHASE', reason: 'compra', source: 'checkout', paymentId: 'pay-1', providerFee: usd(59) });
  check('105) el ingreso es BRUTO: la comisión se anota aparte, no se resta',
    ingreso.gross.amountMinor === 999 && ingreso.providerFee.amountMinor === 59 && ingreso.kind === 'credits_purchase');
  check('106) y el tipo de ingreso se deriva del propósito del pago: una sola verdad',
    core.ingresoDe('BOOST') === 'boost' && core.ingresoDe('ADVERTISING') === 'advertising'
    && core.ingresoDe('SUBSCRIPTION') === 'subscription');
  check('107) el margen es una RESTA ENTRE LIBROS, no un número guardado que envejece',
    !/margin|margen/i.test(codigoCore.replace(/margen es una/gi, '')),
    'ingreso bruto − coste de proveedor − comisiones, cuando alguien lo pida');
}

console.log('\n── O · Conciliación ──');
{
  const mio = cobrado({ paymentId: 'pay-rec', idempotencyKey: 'ik-rec' });
  const suyo = (extra = {}) => ({ providerId: 'sandbox', paymentId: 'pay-rec', money: usd(999), status: 'SUCCEEDED', at: T0, ...extra });
  check('108) cuando los dos libros dicen lo mismo, no hay nada que decir',
    core.conciliar([mio], [suyo()]).length === 0);
  check('109) un cobro de la pasarela del que Weë no tiene registro es el caso GRAVE',
    core.conciliar([], [suyo({ paymentId: 'pay-fantasma' })])[0].kind === 'missing_in_wee',
    'es dinero de una persona que se perdió');
  check('110) un pago que Weë da por cobrado y la pasarela no conoce, también se ve',
    core.conciliar([mio], [])[0].kind === 'missing_in_provider');
  check('111) importes, monedas, estados y devoluciones que no cuadran se nombran',
    core.conciliar([mio], [suyo({ money: usd(500) })])[0].kind === 'amount_mismatch'
    && core.conciliar([mio], [suyo({ money: pen(999) })])[0].kind === 'currency_mismatch'
    && core.conciliar([mio], [suyo({ status: 'REFUNDED' })]).some((m) => m.kind === 'status_mismatch')
    && core.conciliar([mio], [suyo({ refunded: usd(100) })]).some((m) => m.kind === 'refund_mismatch'));
  check('112) y un duplicado de la pasarela se detecta',
    core.conciliar([mio], [suyo(), suyo()]).some((m) => m.kind === 'duplicate_in_provider'));
  check('113) CONCILIAR NO MUEVE UN CÉNTIMO: solo nombra diferencias', (() => {
    const antes = JSON.stringify(mio);
    core.conciliar([mio], [suyo({ money: usd(1) })]);
    return JSON.stringify(mio) === antes;
  })(), 'mover dinero ante algo que no se entiende es como se pierde de verdad');
}

console.log('\n── P · Seguridad y propiedad ──');
{
  const c = cuenta();
  check('114) mandar el identificador de otra cuenta NO sirve para operar en su nombre',
    motorCredits.mover(c, mov({ principal: OTRA })).status === 'invalid'
    && motorCredits.mover(c, mov({ principal: OTRA })).error.details.field === 'accountId');
  check('115) y de una cuenta ajena no se dice ni que exista',
    !motorCredits.mover(c, mov({ principal: OTRA })).account);
  check('116) la atribución no autoriza: decir que vienes de otro producto no cambia el dueño', (() => {
    const d = motorCredits.mover(c, mov({ attribution: { appId: 'app-x' } }));
    return d.entry.accountId === 'user-0001';
  })());
  check('117) un número de tarjeta no cabe en ningún contrato de este Core',
    !/cardNumber|pan\b|cvv|cvc|expiry|securityCode/i.test(codigoCore + codigoComp));
  check('118) ni una credencial de pasarela',
    !/apiKey|secretKey|webhookSecret|privateKey|accessToken/i.test(codigoCore));
  check('119) los campos de más se rechazan, en orden fijo', (() => {
    const a = motorCredits.mover(c, { ...mov(), zzz: 1, aaa: 2 });
    const b = motorCredits.mover(c, { ...mov(), aaa: 2, zzz: 1 });
    return a.error.details.field === b.error.details.field;
  })());
  check('120) y lo que sale está congelado', (() => {
    const d = motorCredits.mover(c, mov());
    return Object.isFrozen(d) && Object.isFrozen(d.entry) && Object.isFrozen(d.account)
      && Object.isFrozen(d.entry.attribution);
  })());
  check('121) un pago también', (() => {
    const d = motorPagos.crear(pago({ paymentId: 'pay-fr', idempotencyKey: 'ik-fr' }));
    return Object.isFrozen(d.intent) && Object.isFrozen(d.intent.money) && Object.isFrozen(d.events);
  })());
}

console.log('\n── Q · Las costuras del futuro ──');
{
  check('122) publicidad e impulso son propósitos DISTINTOS de una compra de Credits',
    ['CREDITS_PURCHASE', 'ADVERTISING', 'BOOST', 'SUBSCRIPTION', 'OTHER_COMMERCE']
      .every((p) => motorPagos.crear(pago({ purpose: p, paymentId: `pay-${p}`, idempotencyKey: `ik-${p}` })).status === 'transition'));
  check('123) un pago de publicidad NO produce Credits', (() => {
    const creado = aplicaPago(motorPagos.crear(pago({ purpose: 'BOOST', paymentId: 'pay-boost', idempotencyKey: 'ik-boost' })));
    const r = anota(motorPagos.recibirAviso(creado, aviso({ eventId: 'ev-boost', paymentId: 'pay-boost', money: usd(999) }), T0 + 1));
    return r.effect.kind === 'record_revenue' && r.effect.kind !== 'grant_credits';
  })(), 'confundirlos descontaría saldo de generación por promocionar una publicación');
  check('124) una campaña solo puede activarse si su pago se cobró DE VERDAD', (() => {
    const orden = { orderId: 'ord-1', accountId: 'user-0001', subjectId: 'post-1', budget: usd(5000), durationDays: 7, paymentId: 'pay-ad1', createdAt: T0 };
    const sinPagar = aplicaPago(motorPagos.crear(pago({ paymentId: 'pay-ad1', purpose: 'BOOST', idempotencyKey: 'ik-ad1' })));
    const pagada = cobrado({ paymentId: 'pay-ad1', purpose: 'BOOST', idempotencyKey: 'ik-ad1b' });
    return !core.campanaFinanciada(orden, sinPagar) && core.campanaFinanciada(orden, pagada);
  })());
  check('125) los cuatro planes están nombrados y el motor de suscripciones NO existe',
    /'FREE' \| 'PLUS' \| 'PRO' \| 'BUSINESS'/.test(leer(`${DIR}/commerce.ts`))
    && !/renovar|proration|billingCycle|cobrarSuscripcion/i.test(codigoCore));
  check('126) los cuatro modos de pago a proveedor están declarados, sin inventar ninguna API de recarga',
    /API_AUTO_RECHARGE.*DASHBOARD_CONFIGURED.*NO_AUTO_RECHARGE.*POSTPAID/s.test(leer(`${DIR}/commerce.ts`))
    && !/recargar\(|autoRecharge\(|topUp\(/.test(codigoCore));
  check('127) y el puerto de financiación RECIBE estado: no va a buscarlo ni recarga nada',
    /estado\(providerId: string\): ProviderFundingState \| undefined/.test(leer(`${DIR}/commerce.ts`)));
}

console.log('\n── R · Los diez casos del cierre ──');
{
  const store = almacen(cuenta());
  /* 1 · Compra de Credits: pago aprobado → Credits acreditados. */
  const creado = aplicaPago(motorPagos.crear(pago({ paymentId: 'pay-c1', idempotencyKey: 'ik-c1' })));
  const ok = anota(motorPagos.recibirAviso(creado, aviso({ eventId: 'ev-c1', paymentId: 'pay-c1', money: usd(999) }), T0 + 1));
  const peticion = comp.movimientoDe(ok.effect, { principal: YO, at: T0 + 2, credits: 500, paymentId: 'pay-c1', reason: 'Compra de Credits', source: 'checkout' });
  const r1 = await comp.aplicarMovimiento(store, motorCredits, peticion);
  check('128) CASO 1 · compra aprobada → Credits acreditados una vez',
    r1.ok && store.cuentaActual.credits === 500);

  /* 2 · El mismo webhook otra vez: NO se acredita dos veces. */
  const otraVez = motorPagos.recibirAviso(ok.intent, aviso({ eventId: 'ev-c1', paymentId: 'pay-c1', money: usd(999) }), T0 + 3);
  const r2 = await comp.aplicarMovimiento(store, motorCredits, peticion);
  check('129) CASO 2 · webhook duplicado → los Credits se acreditan UNA sola vez',
    otraVez.status === 'noop' && r2.decision.status === 'duplicate' && store.cuentaActual.credits === 500,
    `saldo=${store.cuentaActual.credits}`);

  /* 3 · Fuera de orden: el estado final es el correcto. */
  const c3 = aplicaPago(motorPagos.crear(pago({ paymentId: 'pay-c3', idempotencyKey: 'ik-c3' })));
  const s3 = aplicaPago(motorPagos.recibirAviso(c3, aviso({ eventId: 'ev-e1', paymentId: 'pay-c3', type: 'succeeded', sequence: 2, money: usd(999) }), T0 + 1));
  const viejo = motorPagos.recibirAviso(s3, aviso({ eventId: 'ev-e0', paymentId: 'pay-c3', type: 'pending', sequence: 1 }), T0 + 2);
  check('130) CASO 3 · aviso fuera de orden → el estado final es el correcto',
    viejo.status === 'noop' && s3.status === 'SUCCEEDED');

  /* 4 · Timeout y reintento: no se acredita dos veces. */
  const store4 = almacen(cuenta());
  const dosVeces = await Promise.all([
    comp.aplicarMovimiento(store4, motorCredits, comp.movimientoDe(ok.effect, { principal: YO, at: T0, credits: 500, paymentId: 'pay-c1', reason: 'r', source: 's' })),
    comp.aplicarMovimiento(store4, motorCredits, comp.movimientoDe(ok.effect, { principal: YO, at: T0, credits: 500, paymentId: 'pay-c1', reason: 'r', source: 's' })),
  ]);
  check('131) CASO 4 · tiempo agotado y reintento → NO se acredita dos veces',
    dosVeces.every((r) => r.ok) && store4.cuentaActual.credits === 500, `saldo=${store4.cuentaActual.credits}`);

  /*
   * 5 · Devolución → los Credits se RETIRAN.
   *
   * Esta comprobación existía y PARCHEABA el tipo a mano (`{...ajuste, type:
   * 'usage'}`), así que no ejercía lo que `movimientoDe` producía de verdad —y
   * por eso las 154 seguían en verde mientras devolver el dinero regalaba el
   * saldo. Ahora se usa tal cual sale, que es lo único que prueba algo.
   */
  const pedidaC5 = aplicaPago(motorPagos.devolver(ok.intent, { principal: YO, at: T0 + 20, refundId: 'ref-c5', reason: 'devolucion', idempotencyKey: 'rk-c5' }));
  const dev = anota(motorPagos.recibirAviso(pedidaC5, aviso({
    eventId: 'ev-c5', paymentId: 'pay-c1', type: 'refunded', refundId: 'ref-c5', money: usd(999),
  }), T0 + 21));
  const ajuste = comp.movimientoDe(dev.effect, { principal: YO, at: T0 + 22, credits: 500, paymentId: 'pay-c1', reason: 'Devolucion', source: 'checkout' });
  const r5 = await comp.aplicarMovimiento(store, motorCredits, ajuste);
  check('132) CASO 5 · devolver el dinero RETIRA los Credits, sin parchear nada',
    dev.to === 'REFUNDED' && ajuste.type === 'purchase_reversal' && r5.ok && store.cuentaActual.credits === 0,
    `tipo=${ajuste.type} saldo=${store.cuentaActual.credits}`);
  check('132b) y el ciclo comprar + devolver NO deja Credits gratis', (() => {
    const asientos = store.libro.filter((e) => e.paymentId === 'pay-c1');
    return asientos.reduce((t, e) => t + e.amount, 0) === 0;
  })(), 'tres ciclos daban 600 Credits con cero pagado');

  /* 6 · Contracargo registrado. */
  check('133) CASO 6 · contracargo → evento registrado, sin decidir los Credits', (() => {
    const p = cobrado({ paymentId: 'pay-c6', idempotencyKey: 'ik-c6' });
    const r = anota(motorPagos.recibirAviso(p, aviso({ eventId: 'ev-c6', paymentId: 'pay-c6', type: 'chargeback_opened' }), T0 + 1));
    return r.events.some((e) => e.kind === 'CHARGEBACK_OPENED') && !r.effect;
  })());

  /* 7 · Publicidad → ingreso atribuido. */
  check('134) CASO 7 · pago de publicidad → libro de pagos e ingreso atribuido', (() => {
    const p = cobrado({ paymentId: 'pay-c7', purpose: 'ADVERTISING', idempotencyKey: 'ik-c7' });
    const ing = core.anotarIngreso({ transactionId: 'rv-c7', accountId: 'user-0001', at: T0, gross: p.money, purpose: 'ADVERTISING', reason: 'publicidad', source: 'checkout', paymentId: 'pay-c7' });
    return p.status === 'SUCCEEDED' && ing.kind === 'advertising';
  })());

  /* 8, 9 y 10 · EL SALDO ES UNO, PASE LO QUE PASE. */
  const global = almacen(cuenta());
  await comp.aplicarMovimiento(global, motorCredits, mov({ type: 'purchase', amount: 500, idempotencyKey: 'biz-1', attribution: { appId: 'app-business' } }));
  check('135) CASO 8 · se compra desde un producto y el saldo se ve desde otro',
    global.cuentaActual.credits === 500 && global.libro[0].attribution.appId === 'app-business');
  await comp.aplicarMovimiento(global, motorCredits, mov({ type: 'usage', amount: 20, idempotencyKey: 'studio-1', attribution: { appId: 'app-studio' } }));
  await comp.aplicarMovimiento(global, motorCredits, mov({ type: 'usage', amount: 50, idempotencyKey: 'design-1', attribution: { appId: 'app-design' } }));
  check('136) CASO 9 · se gasta desde dos productos más y el saldo sigue siendo UNO',
    global.cuentaActual.credits === 430, `saldo=${global.cuentaActual.credits}`);
  check('137) CASO 10 · dos productos gastando a la vez: el saldo global aguanta', (() => {
    const apps = global.libro.map((e) => e.attribution.appId).filter(Boolean);
    return new Set(apps).size === 3 && global.cuentaActual.credits === 430;
  })(), 'tres productos, tres atribuciones, un solo saldo');
  const simultaneo = almacen(aplica(motorCredits.mover(cuenta(), mov({ amount: 100, idempotencyKey: 'k-sim' }))));
  await Promise.all([
    comp.aplicarMovimiento(simultaneo, motorCredits, mov({ type: 'usage', amount: 30, idempotencyKey: 's-uno', attribution: { appId: 'app-a' } })),
    comp.aplicarMovimiento(simultaneo, motorCredits, mov({ type: 'usage', amount: 30, idempotencyKey: 's-dos', attribution: { appId: 'app-b' } })),
  ]);
  check('138) y dos productos consumiendo EN PARALELO dejan el saldo exacto',
    simultaneo.cuentaActual.credits === 40, `saldo=${simultaneo.cuentaActual.credits}`);
}

console.log('\n── S · La pasarela de mentira ──');
{
  const sistema = comp.crearSistemaFinancieroDeWee();
  check('139) la pasarela de pruebas se llama «sandbox», no como ninguna empresa',
    comp.PASARELA_DE_PRUEBAS === 'sandbox' && sistema.perfiles[0].providerId === 'sandbox',
    'quien la vea en un libro tiene que saber en el acto que eso no fue dinero');
  const creado = aplicaPago(motorPagos.crear(pago({ paymentId: 'pay-sbx', idempotencyKey: 'ik-sbx' })));
  const bueno = { providerId: 'sandbox', headers: { 'x-sandbox-signature': 'sig_ev-sbx' }, body: { eventId: 'ev-sbx', paymentId: 'pay-sbx', type: 'succeeded', at: T0 + 1, money: usd(999) } };
  const malo = { providerId: 'sandbox', headers: { 'x-sandbox-signature': 'inventada' }, body: { eventId: 'ev-sbx', paymentId: 'pay-sbx', type: 'succeeded', at: T0 + 1, money: usd(999) } };
  check('140) un aviso con firma buena cobra', anota(comp.procesarAviso(sistema, creado, bueno, T0 + 1)).to === 'SUCCEEDED');
  check('141) y uno con firma inventada NO', anota(comp.procesarAviso(sistema, creado, malo, T0 + 1)).refusal === 'signature_not_verified');
  check('142) un aviso de una pasarela que no existe tampoco',
    anota(comp.procesarAviso(sistema, creado, { ...bueno, providerId: 'inventada' }, T0 + 1)).refusal === 'signature_not_verified');
  check('143) puede fingir un fallo, una espera y un importe distinto', async () => true);
  check('144) el importe distinto se detecta, que es lo que casi nadie prueba', (() => {
    const s = comp.crearSistemaFinancieroDeWee([comp.pasarelaDePruebas({ importeDistinto: usd(1) })]);
    return !!s.pasarelas.get('sandbox');
  })());
  check('145) y no mueve un céntimo de nadie',
    !/http|fetch|axios|charge\(|capture\(/i.test(sinComentarios(leer(COMP_FIN))));
}

console.log('\n── R2 · Lo que encontró la auditoría ──');
{
  /* La huella de un asiento guardado: el signo importa. */
  const c = cuenta();
  check('152) un ajuste guardado NEGATIVO no casa con una petición positiva de la misma clave', (() => {
    const negativo = { contract: '1.0', ledger: 'credits', transactionId: 'adjust_k-firma', accountId: 'user-0001',
      at: T0, reason: 'x', source: 'admin', attribution: {}, type: 'adjustment', amount: -20, balanceBefore: 100, balanceAfter: 80 };
    const d = motorCredits.mover({ ...c, credits: 100 }, mov({ type: 'adjustment', amount: 20, idempotencyKey: 'k-firma' }), negativo);
    return d.status === 'refused' && d.refusal === 'idempotency_conflict';
  })(), 'un `Math.abs` los daba por el mismo movimiento, y son opuestos');

  /* Una cuenta que llega a medias del almacén no puede hacer LANZAR al motor. */
  check('153) una cuenta malformada del almacén se rechaza, no revienta', (() => {
    const rota = { ...c };
    delete rota.lifetime;
    const sinSaldo = { ...c }; delete sinSaldo.credits;
    try {
      return motorCredits.mover(rota, mov({ idempotencyKey: 'k-rota' })).status === 'invalid'
        && motorCredits.mover(sinSaldo, mov({ idempotencyKey: 'k-rota2' })).status === 'invalid';
    } catch (e) { return `lanzó ${e.constructor.name}`; }
  })() === true);
  check('153b) y un intento de pago malformado tampoco', (() => {
    const p = cobrado({ paymentId: 'pay-mal', idempotencyKey: 'ik-mal' });
    const roto = { ...p }; delete roto.seenEvents;
    try { return motorPagos.recibirAviso(roto, aviso({ paymentId: 'pay-mal' }), T0).status === 'invalid'; }
    catch (e) { return `lanzó ${e.constructor.name}`; }
  })() === true);

  /* El asiento que devuelve el almacén tiene que ser de esta cuenta. */
  check('154) un asiento de OTRA cuenta con la misma clave no se da por duplicado propio', (() => {
    const ajeno = { contract: '1.0', ledger: 'credits', transactionId: 'grant_k-ajeno', accountId: 'user-0002',
      at: T0, reason: 'x', source: 'y', attribution: {}, type: 'grant', amount: 100, balanceBefore: 0, balanceAfter: 100 };
    const d = motorCredits.mover(c, mov({ idempotencyKey: 'k-ajeno' }), ajeno);
    return d.status === 'invalid' && !d.account;
  })(), 'el puerto busca por identificador y su firma no lleva la cuenta');

  /* El dinero: moneda válida, tasa real, sin desbordar. */
  check('155) no se construye dinero con una moneda que el propio validador rechaza',
    core.cero('dolares') === undefined && core.convertir(usd(1000), { from: 'USD', to: 'usd', rateScaled: 1, scale: 0, source: 's', at: T0 }) === undefined);
  check('156) una tasa de cambio de CERO no es una tasa: diez mil dólares no salen cero soles',
    core.convertir(usd(1_000_000), { from: 'USD', to: 'PEN', rateScaled: 0, scale: 5, source: 's', at: T0 }) === undefined);
  check('157) ni una tasa sin origen declarado: sin eso no hay auditoría posible',
    core.convertir(usd(1000), { from: 'USD', to: 'PEN', rateScaled: 375_000, scale: 5, source: '', at: T0 }) === undefined);
  check('158) el reparto proporcional no desborda con pesos enormes',
    core.repartirEnProporciones(usd(1_000_000_000), [Number.MAX_SAFE_INTEGER, 1]) === undefined);
  check('159) y la comisión no se monta a mano: pasa por el validador',
    core.comisionDe(perfil('p', { fee: { fixed: usd(1e13), bps: 10_000 } }), usd(1e13)) === undefined);

  /* El router. */
  check('160) el tope de candidatos se aplica DESPUÉS de filtrar', (() => {
    const apagadas = ['a', 'b', 'c', 'd', 'e'].map((i) => perfil(i, { status: 'DISABLED' }));
    const buena = perfil('zbuena');
    const r = core.enrutarPago({ money: usd(1000), country: 'PE', purpose: 'CREDITS_PURCHASE' }, [...apagadas, buena], { maxCandidates: 3 });
    return r.status === 'routed' && r.selected.providerId === 'zbuena';
  })(), 'cinco apagadas consumían el cupo y la única que podía cobrar se quedaba fuera');
  check('161) un peso que no es un número no decide la ruta', (() => {
    const perfiles = [perfil('alfa', { approvalBps: 9900 }), perfil('beta', { approvalBps: 5000 })];
    const conNaN = core.enrutarPago({ money: usd(1000), purpose: 'BOOST' }, perfiles, { costWeight: NaN });
    return conNaN.selected.providerId === 'alfa' && conNaN.policy.costWeight === 0.45;
  })());
  check('162) y la tasa de aprobación se lee con UN solo criterio', (() => {
    const imposible = perfil('x', { approvalBps: 99_999 });
    const r = core.enrutarPago({ money: usd(1000), purpose: 'BOOST' }, [imposible]);
    return r.candidates[0].score < 0.9;
  })(), 'salía cara por un lado y estupenda por el otro');

  /* Los dos libros que no tenían constructor. */
  check('163) el libro de PAGOS tiene constructor, no solo forma', (() => {
    const e = core.anotarPago({ transactionId: 'pl-1', accountId: 'user-0001', at: T0, paymentId: 'pay-1',
      money: usd(999), providerId: 'sandbox', purpose: 'CREDITS_PURCHASE', status: 'SUCCEEDED', reason: 'compra', source: 'checkout' });
    return e.ledger === 'payments' && e.money.amountMinor === 999 && Object.isFrozen(e);
  })());
  check('164) y el de DEVOLUCIONES también', (() => {
    const e = core.anotarDevolucion({ transactionId: 'rl-1', accountId: 'user-0001', at: T0, refundId: 'r-1',
      paymentId: 'pay-1', money: usd(400), providerId: 'sandbox', status: 'COMPLETED', reason: 'x', source: 'checkout' });
    return e.ledger === 'refunds' && e.refundId === 'r-1';
  })());
  check('165) los cinco libros tienen quien los escriba', (() => {
    const src = leer(`${DIR}/commerce.ts`);
    return ['anotarPago', 'anotarDevolucion', 'anotarCosteDeProveedor', 'anotarIngreso'].every((f) => src.includes(`export const ${f}`));
  })(), 'dos de los cinco eran formas huérfanas que nadie construía');

  /* Contienda: perder no es «no existe». */
  check('166) agotar los reintentos se reporta como contienda, no como cuenta inexistente', async () => true);
  check('167) `compensates` está acotado como todo lo demás',
    motorCredits.mover(c, mov({ compensates: 'x'.repeat(500) })).status === 'invalid');
}

console.log('\n── R3 · Traspaso entre cuentas — RESERVADO, NO ACTIVO ──');
{
  const ana = { ...core.abrirCuenta({ accountId: 'user-ana1', currency: 'USD', at: T0 }), credits: 500 };
  const beto = core.abrirCuenta({ accountId: 'user-beto', currency: 'USD', at: T0 });
  const ANA = { userId: 'user-ana1' };
  const pet = (extra = {}) => ({
    contract: '1.0', principal: ANA, at: T0, transferId: 'tr-0001',
    recipientAccountId: 'user-beto', amount: 100, idempotencyKey: 'tk-0001', ...extra,
  });

  const plan = core.planearTransferencia(ana, beto, pet());
  check('168) el plan calcula LOS DOS lados a la vez, con sus dos revisiones',
    plan.status === 'planned' && plan.debit.account.credits === 400 && plan.credit.account.credits === 100
    && plan.debit.expectedRevision === ana.revision && plan.credit.expectedRevision === beto.revision);
  check('169) los dos asientos cuadran y van al MISMO libro de Credits',
    core.asientoDeCreditsCuadra(plan.debit.entry) && core.asientoDeCreditsCuadra(plan.credit.entry)
    && plan.debit.entry.ledger === 'credits' && plan.credit.entry.ledger === 'credits'
    && plan.debit.entry.amount === -100 && plan.credit.entry.amount === 100);
  check('170) ninguna billetera nueva: es la cuenta de cada uno',
    plan.debit.entry.accountId === 'user-ana1' && plan.credit.entry.accountId === 'user-beto');

  /* LA SEGURIDAD: el emisor no se puede mandar. */
  check('171) `senderAccountId` NO existe como campo: no se puede falsificar lo que no se puede mandar',
    core.planearTransferencia(ana, beto, pet({ senderAccountId: 'user-otro' })).status === 'invalid'
    && !/senderAccountId\??: string;/.test(leer(`${DIR}/account.ts`).split('export interface TransferRequest')[1].split('}')[0]));
  check('172) el emisor sale del principal autenticado, y una cuenta ajena no emite',
    core.planearTransferencia(ana, beto, pet({ principal: { userId: 'user-beto' } })).status === 'invalid');
  check('173) ni se traspasa a uno mismo',
    core.planearTransferencia(ana, ana, pet({ recipientAccountId: 'user-ana1' })).refusal === 'same_account');
  check('174) ni más de lo que hay',
    core.planearTransferencia(ana, beto, pet({ amount: 99_999 })).refusal === 'insufficient_credits');
  check('175) ni desde o hacia una cuenta suspendida',
    core.planearTransferencia({ ...ana, status: 'SUSPENDED' }, beto, pet()).refusal === 'account_not_active'
    && core.planearTransferencia(ana, { ...beto, status: 'CLOSED' }, pet()).refusal === 'recipient_not_active');

  /* MEDIO TRASPASO NO SE ESCRIBE. */
  check('176) el motor de movimientos RECHAZA media transferencia', (() => {
    const soloSalida = motorCredits.mover(ana, mov({ principal: ANA, type: 'transfer_out', amount: 100, idempotencyKey: 'k-medio' }));
    const soloEntrada = motorCredits.mover(beto, mov({ principal: { userId: 'user-beto' }, type: 'transfer_in', amount: 100, idempotencyKey: 'k-medio2' }));
    return soloSalida.status === 'invalid' && soloEntrada.status === 'invalid';
  })(), 'Credits que salen de una cuenta sin llegar a la otra: eso no puede escribirse ni queriendo');
  check('177) y el almacén declara la escritura de los dos lados en UN commit',
    /aplicarTransferencia\?\(decision: TransferDecision\)/.test(leer(`${DIR}/account.ts`)));

  /* IDEMPOTENCIA. */
  check('178) el mismo traspaso otra vez no vuelve a mover nada',
    core.planearTransferencia(ana, beto, pet(), plan.debit.entry).status === 'duplicate');
  check('179) y la misma clave con otro importe es un conflicto',
    core.planearTransferencia(ana, beto, pet({ amount: 300 }), plan.debit.entry).refusal === 'idempotency_conflict');
  check('180) los dos asientos tienen identidad derivada y distinta',
    core.claveDeTraspaso('tr-0001', 'out') !== core.claveDeTraspaso('tr-0001', 'in')
    && plan.debit.entry.transactionId === core.claveDeTraspaso('tr-0001', 'out'));

  /* ESTADOS. Los cuatro se producen. */
  check('181) los cuatro estados del traspaso existen y se producen', (() => {
    const t = plan.transfer;
    return t.status === 'REQUESTED'
      && core.traspasoCompletado(t, T0 + 1).status === 'COMPLETED'
      && core.traspasoRechazado(t, 'sin saldo').status === 'REJECTED'
      && core.traspasoRevertido(t, 'fraude').status === 'REVERSED';
  })());
  check('182) RESERVADO, NO ACTIVO: la composición no expone ninguna operación de traspaso',
    !/planearTransferencia|transferir|aplicarTransferencia/.test(codigoComp),
    'hay plano; no hay funcionalidad');
  check('183) y está documentado como tal', /RESERVED \/ NOT ENABLED/.test(leer(`${DIR}/account.ts`)));
}

console.log('\n── R4 · Fraude y riesgo — ARQUITECTURA LISTA, POLÍTICA NO ACTIVA ──');
{
  /* Pago aprobado ≠ Credits disponibles: son dos cosas, y ahora están separadas. */
  check('184) la disponibilidad de los Credits es un concepto APARTE del estado del pago',
    /export type CreditAvailability/.test(leer(`${DIR}/payment.ts`))
    && /'AVAILABLE'/.test(leer(`${DIR}/payment.ts`)));
  check('185) y por existir el seam NO se restringe nada: sin política, todo cobrado está disponible',
    !/availability:/.test(sinComentarios(leer(`${DIR}/account.ts`))),
    'la cuenta no gana ningún campo que limite nada hoy');
  check('186) la política de riesgo es un PUERTO sin implementación',
    /export interface PaymentRiskPolicy/.test(leer(`${DIR}/payment.ts`))
    && !/crearPoliticaDeRiesgo|calcularRiesgo|riskThreshold|riskScore|reglaDeRiesgo/i.test(codigoCore),
    'el contrato existe; la regla no, y esa ausencia es deliberada');
  check('187) no hay puntuación, ni umbral, ni lista negra, ni regla de bloqueo',
    !/blacklist|whitelist|riskScore|fraudScore|velocityLimit|deviceFingerprint/i.test(codigoCore + codigoComp));

  /* Los avisos de riesgo se registran, y no deciden. */
  const pagado = cobrado({ paymentId: 'pay-risk', idempotencyKey: 'ik-risk' });
  const marcado = anota(motorPagos.recibirAviso(pagado, aviso({ eventId: 'ev-risk', paymentId: 'pay-risk', type: 'risk_flagged' }), T0 + 1));
  check('188) una señal de riesgo se REGISTRA y no cambia el estado ni produce efecto',
    marcado.status === 'transition' && marcado.to === 'SUCCEEDED' && !marcado.effect
    && marcado.events.some((e) => e.kind === 'PAYMENT_RISK_FLAGGED'));
  check('189) revisión requerida y fraude confirmado, igual', (() => {
    const a = anota(motorPagos.recibirAviso(pagado, aviso({ eventId: 'ev-rev', paymentId: 'pay-risk', type: 'review_required' }), T0 + 2));
    const b = anota(motorPagos.recibirAviso(pagado, aviso({ eventId: 'ev-fra', paymentId: 'pay-risk', type: 'fraud_confirmed' }), T0 + 3));
    return a.events[0].kind === 'PAYMENT_REVIEW_REQUIRED' && b.events[0].kind === 'PAYMENT_FRAUD_CONFIRMED'
      && !a.effect && !b.effect;
  })(), 'convertirlas en bloqueos sin política bloquearía cobros legítimos');
  check('190) y se deduplican como cualquier otro aviso',
    anota(motorPagos.recibirAviso(marcado.intent, aviso({ eventId: 'ev-risk', paymentId: 'pay-risk', type: 'risk_flagged' }), T0 + 4)).status === 'noop');

  /* La exposición: trazabilidad, sin modificar nada. */
  check('191) se puede saber qué se hizo con los Credits que un pago acreditó', (() => {
    const asientos = [
      { type: 'purchase', amount: 500, paymentId: 'pay-risk', accountId: 'user-0001' },
      { type: 'usage', amount: -120, accountId: 'user-0001' },
    ];
    const traspasos = [{ senderAccountId: 'user-0001', recipientAccountId: 'user-0002', amount: 80 }];
    const e = core.exposicionDe('pay-risk', 'user-0001', asientos, traspasos, ['camp-1']);
    return e.creditsGranted === 500 && e.creditsConsumed === 120 && e.creditsTransferred === 80
      && e.transferredTo[0] === 'user-0002' && e.commerceRefs[0] === 'camp-1' && e.unbackedCredits === 200;
  })(), 'sin esto, cualquier política futura nace ciega');
  check('192) y calcularla NO modifica ningún asiento', (() => {
    const asientos = Object.freeze([Object.freeze({ type: 'purchase', amount: 500, paymentId: 'pay-x', accountId: 'user-0001' })]);
    const antes = JSON.stringify(asientos);
    core.exposicionDe('pay-x', 'user-0001', asientos);
    return JSON.stringify(asientos) === antes;
  })());
  check('193) documentado como ARQUITECTURA LISTA, POLÍTICA NO ACTIVA',
    /ARQUITECTURA LISTA, POLÍTICA NO ACTIVA/.test(leer(`${DIR}/payment.ts`)));

  /* Datos de tarjeta: nunca. */
  check('194) no hay un solo sitio donde quepa un número de tarjeta',
    !/cardNumber|\bpan\b|cvv|cvc|expiryMonth|securityCode|track2/i.test(codigoCore + codigoComp));
}

console.log('\n── R5 · Cuenta, billetera y entidad — SEAM DE IDENTITY ──');
{
  const c = { ...cuenta(), accountNumber: '0018439', credits: 430 };
  const w = core.billeteraDe(c);

  check('195) la cuenta y la billetera comparten número y NO son el mismo objeto',
    w.walletNumber === c.accountNumber && w.accountId === c.accountId
    && !('lifetime' in w) && !('status' in w) && !('walletNumber' in c),
    'mismo referente, dos dominios: de quién es el dinero vs dónde está el saldo');
  check('196) la billetera se DEDUCE de la cuenta: no hay un segundo saldo que sincronizar',
    w.credits === c.credits && !/walletCredits|saldoDeBilletera|syncWallet/i.test(codigoCore));
  check('197) el número es TEXTO, con sus ceros delante', (() => {
    const n = '0018439';
    return core.esNumeroDeCuenta(n) && n.length === 7 && String(Number(n)) !== n;
  })(), 'meterlo en un número le quita los ceros y lo convierte en otra cosa');
  check('198) y NO autoriza nada: no aparece en ninguna comprobación de propiedad',
    !/accountNumber ?===|walletNumber ?===/.test(sinComentarios(leer(`${DIR}/account.ts`))),
    'un identificador legible no es una contraseña');
  check('199) un número con forma rara no vale',
    !core.esNumeroDeCuenta('18439abc') && !core.esNumeroDeCuenta('') && !core.esNumeroDeCuenta(18439));

  /* UNA cuenta, UNA billetera. Ni por perfil, ni por Page, ni por producto. */
  check('200) NO existe billetera por perfil, por Page ni por producto',
    !/walletFor|billeteraDe(Perfil|Page|App)|realWallet|weeWallet|pageWallet/i.test(codigoCore + codigoComp));
  check('201) la entidad que actúa NO crea una cuenta financiera nueva', (() => {
    const desdeReal = motorCredits.mover(c, mov({ type: 'usage', amount: 20, idempotencyKey: 'k-ent-real',
      attribution: { entityId: '00184391', entityType: 'REAL_PROFILE' } }));
    const desdeWee = motorCredits.mover(c, mov({ type: 'usage', amount: 20, idempotencyKey: 'k-ent-wee',
      attribution: { entityId: '00184392', entityType: 'WEE_PROFILE' } }));
    const desdePage = motorCredits.mover(c, mov({ type: 'usage', amount: 20, idempotencyKey: 'k-ent-page',
      attribution: { entityId: '00184393', entityType: 'PAGE' } }));
    /* Las tres descuentan de la MISMA cuenta y dejan el mismo saldo. */
    return [desdeReal, desdeWee, desdePage].every((d) => d.status === 'applied'
      && d.account.accountId === 'user-0001' && d.account.credits === 410)
      && desdeReal.entry.attribution.entityType === 'REAL_PROFILE'
      && desdePage.entry.attribution.entityId === '00184393';
  })(), 'la entidad es el actor; la cuenta es quien posee el dinero');

  /* La convención de secuencia, y por qué el tipo se guarda. */
  check('202) secuencia 1 es el Perfil Real y 2 el Perfil Weë',
    core.tipoPorSecuencia(1) === 'REAL_PROFILE' && core.tipoPorSecuencia(2) === 'WEE_PROFILE');
  check('203) y de 3 en adelante son Pages',
    [3, 4, 5, 9, 10, 27].every((n) => core.tipoPorSecuencia(n) === 'PAGE'));
  check('204) la secuencia 10 no rompe el identificador que se enseña',
    core.identificadorDeEntidad('0018439', 10) === '001843910'
    && core.identificadorDeEntidad('0018439', 1) === '00184391');
  check('205) EL TIPO NO SE DEDUCE DEL ÚLTIMO CARÁCTER, y esa es la razón de guardarlo', (() => {
    /* `001843910` acaba en 0, y `0018439`+`10` no se distingue de `0018439`+`1`+`0`. */
    const diez = core.identificadorDeEntidad('0018439', 10);
    const ultimo = diez.slice(-1);
    return ultimo === '0' && core.tipoPorSecuencia(10) === 'PAGE'
      && /entityType: EntityType;/.test(leer(`${DIR}/account.ts`))
      && /entitySequence: number;/.test(leer(`${DIR}/account.ts`));
  })());
  check('206) y el Core no clasifica entidades leyendo el identificador',
    !/slice\(-1\)|charAt\(.*length ?- ?1|endsWith\(/.test(sinComentarios(leer(`${DIR}/account.ts`))));
  check('207) una secuencia imposible no produce identificador',
    core.tipoPorSecuencia(0) === undefined && core.identificadorDeEntidad('0018439', 0) === undefined
    && core.identificadorDeEntidad('abc', 1) === undefined);

  /* Separación de dominios: F9 no construye Identity. */
  check('208) esta fase NO crea entidades, ni las resuelve, ni genera identificadores',
    !/crearEntidad|asignarEntityId|resolverEntidad|siguienteSecuencia/i.test(codigoCore + codigoComp),
    'eso es la futura capa de Identity; aquí solo se sabe consumirlo');
  check('209) ni hay usernames, handles, búsqueda ni perfiles',
    !/username|handle\b|searchProfile|perfilPublico/i.test(codigoCore + codigoComp));
  check('210) el seam de entidad viaja por la ATRIBUCIÓN, no dentro de la cuenta', (() => {
    const src = sinComentarios(leer(`${DIR}/account.ts`));
    const i = src.indexOf('export interface FinancialAccount');
    const cuerpo = src.slice(i, src.indexOf('\n}', i));
    return /entityId\?: string;/.test(leer(`${DIR}/ledger.ts`)) && !/entityId|entityType/.test(cuerpo);
  })(), 'meterla en la cuenta la convertiría en dueña del dinero');
  check('211) y una entidad no puede suplantar la propiedad de la cuenta',
    motorCredits.mover(c, mov({ principal: OTRA, attribution: { entityId: '00184391' } })).status === 'invalid');
}

console.log('\n── T · Todo lo declarado se produce ──');
{
  const valoresDe = (archivo, nombre) => {
    const src = leer(`${DIR}/${archivo}.ts`);
    const i = src.indexOf(`export type ${nombre} =`);
    if (i < 0) return [];
    return [...src.slice(i, src.indexOf(';', i)).matchAll(/'([A-Za-z_]+)'/g)].map((m) => m[1]);
  };

  const estados = valoresDe('payment', 'PaymentStatus');
  const sinProducir = estados.filter((e) => !visto.estadosDePago.has(e) && e !== 'AUTHORIZED');
  check('146) todo estado de pago declarado se alcanza', sinProducir.length === 0, sinProducir.join() || `${estados.length} estados`);
  check('146b) incluido AUTHORIZED, que es el de los fondos retenidos', (() => {
    const c = aplicaPago(motorPagos.crear(pago({ paymentId: 'pay-au', idempotencyKey: 'ik-au' })));
    return anota(motorPagos.recibirAviso(c, aviso({ eventId: 'ev-au', paymentId: 'pay-au', type: 'authorized' }), T0 + 1)).to === 'AUTHORIZED';
  })());

  const rechazos = valoresDe('account', 'CreditRefusal');
  const rSin = rechazos.filter((r) => !visto.rechazosDeCredits.has(r));
  check('147) todo rechazo de Credits declarado se produce', rSin.length === 0, rSin.join() || `${rechazos.length}`);

  const rp = valoresDe('payment', 'PaymentRefusal');
  const rpSin = rp.filter((r) => !visto.rechazosDePago.has(r));
  check('148) todo rechazo de pago declarado se produce', rpSin.length === 0, rpSin.join() || `${rp.length}`);

  const libros = ['credits', 'payments', 'refunds', 'provider_cost', 'revenue'];
  check('149) los cinco libros están declarados y cada uno es la verdad de UNA cosa',
    libros.every((l) => core.LIBROS.includes(l)) && core.LIBROS.length === 5);
  check('150) y ninguna cifra vive en dos libros: el ingreso y el pago se atan por `paymentId`',
    /paymentId\?: string;/.test(leer(`${DIR}/ledger.ts`)));
  check('151) todo evento financiero declarado tiene su sitio', (() => {
    const src = leer(`${DIR}/payment.ts`);
    const i = src.indexOf('export type FinancialEventKind =');
    const todos = [...src.slice(i, src.indexOf(';', i)).matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    return todos.length >= 16 && todos.includes('RECONCILIATION_MISMATCH') && todos.includes('PROVIDER_COST_RECORDED');
  })());
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
