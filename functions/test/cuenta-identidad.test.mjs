/*
 * FASE 11.x-5 — EL CONTRATO DE IDENTIDAD DE CUENTA, EJECUTADO.
 *
 *   A · Seis identificadores que no se pueden confundir.
 *   B · El número de cuenta: nueve dígitos, texto, sorteado sin sesgo.
 *   C · El identificador de entidad: opaco, y sin el número dentro.
 *   D · Lo que se guarda cumple su contrato o no se guarda.
 *   E · Nacer una cuenta: idempotente, atómico y a prueba de concurrencia.
 *   F · La cara Weë es la entidad 2, y solo una.
 *   G · Las Páginas van de la 3 en adelante y no reciclan secuencias.
 *   H · Principal → cuenta: una sola puerta, con membresía.
 *   I · Buscar por número: resuelve, y no autoriza.
 *   J · Privacidad: lo que puede salir de una entidad hacia fuera.
 *   K · Lo que ya estaba cerrado sigue encajando: Financial Core y traspasos.
 *   L · Nada de esto está cableado todavía.
 *
 * Necesita `functions/lib` recién compilado: `npm run build` antes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
/* Sin comentarios: lo que se vigila es el código, no lo que cuenta de sí mismo. */
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const lib = (p) => require(path.resolve(here, '../lib/' + p));

const C = lib('core/account-identity.js');
const identidad = lib('core/identity.js');
const financiero = lib('core/financial/index.js');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const lanza = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };

/* Dados con memoria: la misma semilla da siempre la misma partida. */
const dados = (semilla = 1) => {
  let s = semilla >>> 0 || 1;
  return {
    bytes: (cuantos) => {
      const out = new Uint8Array(cuantos);
      for (let i = 0; i < cuantos; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; out[i] = s & 255; }
      return out;
    },
  };
};
/* Dados trucados: los primeros sorteos dan el número que se quiera. */
const dadosQueRepiten = (numeros, resto) => {
  const cola = [...numeros];
  return {
    bytes: (cuantos) => {
      if (cuantos === 4 && cola.length) {
        const n = Number(cola.shift()) - C.PRIMER_NUMERO_SORTEABLE;
        return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
      }
      return resto.bytes(cuantos);
    },
  };
};

/* ── Un almacén de mentira con transacciones de verdad ───────────────────── */
class BaseDeMentira {
  constructor() { this.docs = new Map(); this.version = new Map(); this.intentos = 0; this.commits = 0; this.abortos = 0; this.maxIntentos = 5; }
  v(ruta) { return this.version.get(ruta) || 0; }
  leer(ruta) { const d = this.docs.get(ruta); return d === undefined ? null : JSON.parse(JSON.stringify(d)); }
  escribir(ruta, datos) { this.docs.set(ruta, JSON.parse(JSON.stringify(datos))); this.version.set(ruta, this.v(ruta) + 1); }
  rutas(prefijo) { return [...this.docs.keys()].filter((r) => r.startsWith(prefijo)); }

  async enTransaccion(cuerpo) {
    for (let intento = 1; intento <= this.maxIntentos; intento++) {
      this.intentos++;
      const leidos = new Map();
      const escrituras = [];
      const marcar = (ruta) => { if (!leidos.has(ruta)) leidos.set(ruta, this.v(ruta)); };
      const tx = {
        leerCuenta: async (id) => { const r = `accounts/${id}`; marcar(r); return this.leer(r); },
        numeroTomado: async (n) => { const r = `accountNumbers/${n}`; marcar(r); return this.leer(r) !== null; },
        leerEntidad: async (id) => { const r = `entities/${id}`; marcar(r); return this.leer(r); },
        leerOperacion: async (id, clave) => { const r = `accounts/${id}/operations/${clave}`; marcar(r); return this.leer(r); },
        guardarCuenta: (c) => escrituras.push(['crear', `accounts/${c.accountId}`, c]),
        tomarNumero: (n, id, at) => escrituras.push(['crear', `accountNumbers/${n}`, { accountId: id, createdAt: at }]),
        guardarMembresia: (m) => escrituras.push(['crear', `accounts/${m.accountId}/members/${m.principalId}`, m]),
        guardarEntidad: (e) => escrituras.push(['crear', `entities/${e.entityId}`, e]),
        guardarOperacion: (id, clave, entityId, at) => escrituras.push(['crear', `accounts/${id}/operations/${clave}`, { entityId, createdAt: at }]),
        actualizarCuenta: (id, campos) => escrituras.push(['actualizar', `accounts/${id}`, campos]),
      };
      const resultado = await cuerpo(tx);
      /* Commit: si algo de lo leído cambió, o un `crear` encuentra el documento puesto, se repite entera. */
      const choque = [...leidos.entries()].some(([ruta, v]) => this.v(ruta) !== v)
        || escrituras.some(([tipo, ruta]) => tipo === 'crear' && this.leer(ruta) !== null);
      if (choque) { this.abortos++; continue; }
      for (const [tipo, ruta, datos] of escrituras) {
        if (tipo === 'crear') this.escribir(ruta, datos);
        else this.escribir(ruta, { ...this.leer(ruta), ...datos });
      }
      this.commits++;
      return resultado;
    }
    throw Object.assign(new Error('transacción abortada'), { code: 10 });
  }
  consulta() {
    return {
      cuentaDelNumero: async (n) => this.leer(`accountNumbers/${n}`)?.accountId ?? null,
      membresia: async (id, p) => this.leer(`accounts/${id}/members/${p}`),
    };
  }
}

const CUENTA_A = 'anaAAAAAAAAAAAAAAAAAAAAAAAA1';
const CUENTA_B = 'betoBBBBBBBBBBBBBBBBBBBBBB02';
const AHORA = 1750000000000;

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Seis identificadores que no se confunden ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const numero = '008432175';
  const entidad = C.idDeEntidadDesdeBytes(dados(7).bytes(26));
  const uidDeCara = `hidi_${CUENTA_A}`;
  const idDeDocumento = 'MGm5iErttc5AASia9xZV';
  const cada = { cuenta: CUENTA_A, numero, entidad, cara: uidDeCara, documento: idDeDocumento };

  check('1) el id de cuenta solo lo acepta el validador de cuenta',
    identidad.esIdDeCuenta(CUENTA_A) && !C.esNumeroDeCuentaCanonico(CUENTA_A) && !C.esIdDeEntidad(CUENTA_A));
  check('2) el número solo lo acepta el validador de número',
    C.esNumeroDeCuentaCanonico(numero) && !identidad.esIdDeCuenta(numero) && !C.esIdDeEntidad(numero));
  check('3) el id de entidad solo lo acepta el validador de entidad',
    C.esIdDeEntidad(entidad) && !identidad.esIdDeCuenta(entidad) && !C.esNumeroDeCuentaCanonico(entidad), entidad);
  check('4) el identificador heredado de una cara no pasa por ninguno de los tres',
    !identidad.esIdDeCuenta(uidDeCara) && !C.esNumeroDeCuentaCanonico(uidDeCara) && !C.esIdDeEntidad(uidDeCara));
  check('5) ni el id de un documento de perfil pasa por entidad o número',
    !C.esIdDeEntidad(idDeDocumento) && !C.esNumeroDeCuentaCanonico(idDeDocumento));
  check('6) ninguno de los cinco vale como otro de los cinco',
    Object.entries(cada).every(([clase, valor]) => {
      const aceptan = [
        identidad.esIdDeCuenta(valor) ? 'cuenta' : null,
        C.esNumeroDeCuentaCanonico(valor) ? 'numero' : null,
        C.esIdDeEntidad(valor) ? 'entidad' : null,
      ].filter(Boolean);
      return clase === 'documento' || clase === 'cara' ? aceptan.length <= 1 : aceptan.length === 1 && aceptan[0] === clase;
    }));
  check('7) un principal es lo que puede fundar una cuenta, y nada más',
    C.esIdDePrincipal(CUENTA_A) && !C.esIdDePrincipal(uidDeCara) && !C.esIdDePrincipal(numero) && !C.esIdDePrincipal(''));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · El número de cuenta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('8) nueve dígitos, ni ocho ni diez', C.ANCHO_DEL_NUMERO_DE_CUENTA === 9
    && C.esNumeroDeCuentaCanonico('000000001') && !C.esNumeroDeCuentaCanonico('00843217') && !C.esNumeroDeCuentaCanonico('0084321756'));
  check('9) es TEXTO: el cero de delante es parte del número', C.esNumeroDeCuentaCanonico('008432175')
    && !C.esNumeroDeCuentaCanonico(8432175) && String(Number('008432175')) !== '008432175');
  check('10) el cero entero no es una cuenta', !C.esNumeroDeCuentaCanonico('000000000'));
  check('11) se normaliza lo que la gente copia', C.normalizarNumeroDeCuenta('008 432 175') === '008432175'
    && C.normalizarNumeroDeCuenta('008-432-175') === '008432175' && C.normalizarNumeroDeCuenta(' 008.432.175 ') === '008432175');
  check('12) pero un número corto NO se rellena: sería el de otra persona',
    C.normalizarNumeroDeCuenta('8432175') === undefined && C.normalizarNumeroDeCuenta('0084321') === undefined);
  check('13) ni pasa nada que no sean dígitos', ['008432l75', '00843217a', '+008432175', '', null, 8432175, {}]
    .every((v) => C.normalizarNumeroDeCuenta(v) === undefined));
  check('14) se enseña en grupos de tres, y eso es presentación', C.formatearNumeroDeCuenta('008432175') === '008 432 175'
    && C.normalizarNumeroDeCuenta(C.formatearNumeroDeCuenta('008432175')) === '008432175');
  check('15) los cien mil primeros quedan reservados y no se sortean',
    C.esNumeroDeCuentaReservado('000000001') && C.esNumeroDeCuentaReservado('000099999') && !C.esNumeroDeCuentaReservado('000100000'));

  const d = dados(12345);
  const sorteados = [];
  for (let i = 0; i < 5000; i++) { const n = C.sortearNumeroDeCuenta(d.bytes(4)); if (n) sorteados.push(n); }
  check('16) todo lo sorteado es un número canónico y no reservado', sorteados.length > 4000
    && sorteados.every((n) => C.esNumeroDeCuentaCanonico(n) && !C.esNumeroDeCuentaReservado(n)), `${sorteados.length} sorteos válidos`);
  check('17) el mismo sorteo con los mismos bytes da el mismo número',
    C.sortearNumeroDeCuenta([1, 2, 3, 4]) === C.sortearNumeroDeCuenta([1, 2, 3, 4]));
  check('18) y con bytes que se salen del reparto justo, no da ninguno: se vuelve a sortear',
    C.sortearNumeroDeCuenta([255, 255, 255, 255]) === undefined && C.sortearNumeroDeCuenta([1, 2, 3]) === undefined);
  /* Sin sesgo: en diez tramos iguales del rango, ninguno se lleva mucho más que otro. */
  const tramos = new Array(10).fill(0);
  for (const n of sorteados) tramos[Math.min(9, Math.floor((Number(n) - C.PRIMER_NUMERO_SORTEABLE) / ((C.ULTIMO_NUMERO_SORTEABLE - C.PRIMER_NUMERO_SORTEABLE + 1) / 10)))]++;
  const esperado = sorteados.length / 10;
  check('19) el sorteo reparte parejo: ningún tramo del rango es favorito',
    tramos.every((t) => Math.abs(t - esperado) < esperado * 0.25), tramos.join('/'));
  check('20) y no se repite casi nunca: 5000 sorteos, 5000 números distintos', new Set(sorteados).size === sorteados.length);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · El identificador de entidad ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const d = dados(99);
  const ids = [];
  for (let i = 0; i < 2000; i++) ids.push(C.idDeEntidadDesdeBytes(d.bytes(26)));
  check('21) todos tienen la forma acordada y son distintos',
    ids.every(C.esIdDeEntidad) && new Set(ids).size === ids.length);
  check('22) no lleva dentro el número de la cuenta ni la cuenta, y el generador ni siquiera sabe el tipo',
    ids.every((id) => !id.includes('008432175') && !id.includes(CUENTA_A))
    && /export const idDeEntidadDesdeBytes = \(bytes: Uint8Array \| readonly number\[\]\)/.test(leer('functions/src/core/account-identity.ts')));
  check('23) el alfabeto evita las letras que se confunden al leer',
    !C.ALFABETO_DE_ID_DE_ENTIDAD.includes('i') && !C.ALFABETO_DE_ID_DE_ENTIDAD.includes('l')
    && !C.ALFABETO_DE_ID_DE_ENTIDAD.includes('o') && !C.ALFABETO_DE_ID_DE_ENTIDAD.includes('u'));
  check('24) sin bytes suficientes no hay identificador', C.idDeEntidadDesdeBytes([1, 2, 3]) === undefined && C.idDeEntidadDesdeBytes(null) === undefined);
  /*
   * EL FORMATO DE LA FASE 10 YA NO EXISTE (retirado en la 11.x-5A). Llevaba el
   * número de la cuenta dentro del identificador de cada entidad —`008432175`
   * más la secuencia— y con eso las dos caras de una misma persona eran
   * enlazables a simple vista. Aquí se comprueba que no quedó ni la función ni
   * nada que produzca esa forma.
   */
  check('25) el formato de la Fase 10 se retiró: ya no hay forma de formar un id con el número dentro',
    identidad.identificadorDeEntidad === undefined
    && !C.esIdDeEntidad('0084321752')
    && !/identificadorDeEntidad|\$\{accountNumber\}\$\{entitySequence\}/.test(sinComentarios(leer('functions/src/core/identity.ts'))));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Lo que se guarda cumple su contrato ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new BaseDeMentira();
  const { cuenta, entidadReal } = await C.asegurarCuenta(bd, dados(3), { principalId: CUENTA_A, at: AHORA });
  check('26) la cuenta guardada es válida y lleva a su fundador y a su Perfil Real',
    C.cuentaWeeValida(cuenta) && cuenta.foundingPrincipalId === CUENTA_A && cuenta.realProfileEntityId === entidadReal.entityId);
  check('27) la entidad guarda su tipo y su secuencia, las dos explícitas',
    entidadReal.entityType === 'REAL_PROFILE' && entidadReal.entitySequence === 1 && C.entidadDeCuentaValida(entidadReal));
  check('28) y apunta a su perfil por el CAMPO uid, no por un id de documento',
    entidadReal.profileRef.coleccion === 'users' && entidadReal.profileRef.uid === CUENTA_A);
  check('29) una entidad cuyo tipo y secuencia se contradicen no vale',
    !C.entidadDeCuentaValida({ ...entidadReal, entityType: 'PAGE' }) && !C.entidadDeCuentaValida({ ...entidadReal, entitySequence: 3 }));
  check('30) ni una con un identificador que no es opaco',
    !C.entidadDeCuentaValida({ ...entidadReal, entityId: '0084321751' }));
  check('31) ni una cuenta con un número que no es canónico',
    !C.cuentaWeeValida({ ...cuenta, accountNumber: '8432175' }) && !C.cuentaWeeValida({ ...cuenta, accountNumber: 8432175 }));
  check('32) la membresía del dueño nace con la cuenta', C.membresiaValida(bd.leer(`accounts/${CUENTA_A}/members/${CUENTA_A}`))
    && bd.leer(`accounts/${CUENTA_A}/members/${CUENTA_A}`).role === 'OWNER');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Nacer una cuenta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new BaseDeMentira();
  const primera = await C.asegurarCuenta(bd, dados(5), { principalId: CUENTA_A, at: AHORA });
  const commits = bd.commits;
  const segunda = await C.asegurarCuenta(bd, dados(6), { principalId: CUENTA_A, at: AHORA + 1000 });
  check('33) la segunda vez devuelve la misma cuenta, el mismo número y no escribe nada',
    !segunda.creada && segunda.cuenta.accountNumber === primera.cuenta.accountNumber && bd.commits === commits + 1
    && bd.rutas('accountNumbers/').length === 1);

  /* Veinticinco veces la misma petición: una cuenta, un número, una membresía, un Perfil Real. */
  const bd25 = new BaseDeMentira();
  const r25 = await Promise.all(Array.from({ length: 25 }, (_, i) => C.asegurarCuenta(bd25, dados(100 + i), { principalId: CUENTA_B, at: AHORA })));
  check('34) veinticinco peticiones idénticas dejan UNA cuenta',
    bd25.rutas('accounts/').filter((r) => r.split('/').length === 2).length === 1
    && bd25.rutas('accountNumbers/').length === 1
    && bd25.rutas(`accounts/${CUENTA_B}/members/`).length === 1
    && bd25.rutas('entities/').length === 1
    && r25.filter((x) => x.creada).length === 1
    && new Set(r25.map((x) => x.cuenta.accountNumber)).size === 1);

  for (const n of [1, 2, 5, 10, 25, 50, 100]) {
    const b = new BaseDeMentira();
    b.maxIntentos = 200;
    const cuentas = Array.from({ length: n }, (_, i) => `sonda${String(i).padStart(3, '0')}AAAAAAAAAAAAAAAAAA`);
    const r = await Promise.all(cuentas.map((id, i) => C.asegurarCuenta(b, dados(1000 + i), { principalId: id, at: AHORA })));
    const numeros = new Set(r.map((x) => x.cuenta.accountNumber));
    check(`35) ${String(n).padStart(3)} cuentas distintas a la vez: ${n} números distintos, ninguna repetida`,
      numeros.size === n && b.rutas('accountNumbers/').length === n && r.every((x) => x.creada),
      `${b.abortos} reintentos`);
  }
  for (const n of [1, 2, 5, 10, 25, 50, 100]) {
    const b = new BaseDeMentira();
    b.maxIntentos = 200;
    const r = await Promise.all(Array.from({ length: n }, (_, i) => C.asegurarCuenta(b, dados(2000 + i), { principalId: CUENTA_A, at: AHORA })));
    check(`36) ${String(n).padStart(3)} peticiones a la vez para la MISMA cuenta: nace una sola`,
      r.filter((x) => x.creada).length === 1 && new Set(r.map((x) => x.cuenta.accountNumber)).size === 1
      && b.rutas('accountNumbers/').length === 1 && b.rutas('entities/').length === 1,
      `${b.abortos} reintentos`);
  }

  /* Un número ya tomado no se reparte dos veces: se sortea otro dentro del mismo intento. */
  const bdc = new BaseDeMentira();
  await C.asegurarCuenta(bdc, dadosQueRepiten(['000500000'], dados(11)), { principalId: CUENTA_A, at: AHORA });
  const segundaCuenta = await C.asegurarCuenta(bdc, dadosQueRepiten(['000500000', '000600000'], dados(12)), { principalId: CUENTA_B, at: AHORA });
  check('37) si el número sorteado ya estaba tomado, se sortea otro',
    bdc.leer(`accounts/${CUENTA_A}`).accountNumber === '000500000' && segundaCuenta.cuenta.accountNumber === '000600000');
  check('38) y ningún número queda reservado sin cuenta detrás',
    bdc.rutas('accountNumbers/').every((r) => bdc.leer(`accounts/${bdc.leer(r).accountId}`) !== null)
    && bdc.rutas('accountNumbers/').length === 2);

  /* Ocho sorteos ocupados dentro del mismo intento: se rinde sin escribir nada. */
  const bdx = new BaseDeMentira();
  const ocupados = [];
  for (let i = 0; i < C.SORTEOS_POR_INTENTO; i++) { const n = String(700000 + i).padStart(9, '0'); bdx.escribir(`accountNumbers/${n}`, { accountId: 'otra' }); ocupados.push(n); }
  const error = await lanza(() => C.asegurarCuenta(bdx, dadosQueRepiten(ocupados, dados(13)), { principalId: CUENTA_A, at: AHORA }));
  check('39) si todos los sorteos de un intento están ocupados, no se escribe nada y se avisa',
    !!error && bdx.rutas('accounts/').length === 0 && bdx.rutas('entities/').length === 0, error?.message?.slice(0, 60));

  /* Respuesta perdida: el cliente reintenta y recibe exactamente lo mismo. */
  const bdp = new BaseDeMentira();
  const antes = await C.asegurarCuenta(bdp, dados(21), { principalId: CUENTA_A, at: AHORA });
  const despues = await C.asegurarCuenta(bdp, dados(22), { principalId: CUENTA_A, at: AHORA + 99999 });
  check('40) respuesta perdida: al reintentar, la misma cuenta y el mismo número',
    despues.cuenta.accountNumber === antes.cuenta.accountNumber && despues.cuenta.createdAt === antes.cuenta.createdAt && !despues.creada);
  check('41) un principal con forma inválida no funda nada',
    (await lanza(() => C.asegurarCuenta(new BaseDeMentira(), dados(1), { principalId: 'hidi_' + CUENTA_A, at: AHORA }))) !== null
    && (await lanza(() => C.asegurarCuenta(new BaseDeMentira(), dados(1), { principalId: '000123456', at: AHORA }))) !== null);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · La cara Weë ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new BaseDeMentira();
  await C.asegurarCuenta(bd, dados(31), { principalId: CUENTA_A, at: AHORA });
  const cara = `hidi_${CUENTA_A}`;
  const primera = await C.asegurarEntidadDeCaraWee(bd, dados(32), { accountId: CUENTA_A, perfilUid: cara, at: AHORA });
  const segunda = await C.asegurarEntidadDeCaraWee(bd, dados(33), { accountId: CUENTA_A, perfilUid: cara, at: AHORA + 10 });
  check('42) la cara Weë es la entidad 2 de su cuenta, y apunta a su perfil heredado',
    primera.creada && primera.entidad.entitySequence === 2 && primera.entidad.entityType === 'WEE_PROFILE'
    && primera.entidad.profileRef.uid === cara && primera.entidad.ownerAccountId === CUENTA_A);
  check('43) pedirla otra vez devuelve la misma y no crea otra',
    !segunda.creada && segunda.entidad.entityId === primera.entidad.entityId && bd.rutas('entities/').length === 2);
  const diez = await Promise.all(Array.from({ length: 10 }, (_, i) => C.asegurarEntidadDeCaraWee(bd, dados(40 + i), { accountId: CUENTA_A, perfilUid: cara, at: AHORA })));
  check('44) diez a la vez tampoco crean una segunda cara',
    diez.every((x) => !x.creada) && bd.rutas('entities/').length === 2);
  check('45) su identificador no se parece en nada al de su Perfil Real: las dos caras no se enlazan mirándolas',
    primera.entidad.entityId !== bd.leer(`accounts/${CUENTA_A}`).realProfileEntityId
    && !primera.entidad.entityId.includes(bd.leer(`accounts/${CUENTA_A}`).accountNumber));
  check('46) sin cuenta no hay cara', (await lanza(() => C.asegurarEntidadDeCaraWee(new BaseDeMentira(), dados(1), { accountId: CUENTA_B, perfilUid: `hidi_${CUENTA_B}`, at: AHORA }))) !== null);
  check('47) ni con un identificador de perfil que es la propia cuenta',
    (await lanza(() => C.asegurarEntidadDeCaraWee(bd, dados(1), { accountId: CUENTA_A, perfilUid: CUENTA_A, at: AHORA }))) !== null);
  check('48) el Core NO compone el prefijo heredado: lo recibe leído de los datos',
    !/hidi_/.test(leer('functions/src/core/account-identity.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Las Páginas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new BaseDeMentira();
  await C.asegurarCuenta(bd, dados(51), { principalId: CUENTA_A, at: AHORA });
  const p1 = await C.crearPagina(bd, dados(52), { accountId: CUENTA_A, clave: 'p1', at: AHORA });
  const p2 = await C.crearPagina(bd, dados(53), { accountId: CUENTA_A, clave: 'p2', at: AHORA });
  const p3 = await C.crearPagina(bd, dados(54), { accountId: CUENTA_A, clave: 'p3', at: AHORA });
  check('49) las Páginas empiezan en la 3 y siguen hacia arriba',
    [p1, p2, p3].map((p) => p.entidad.entitySequence).join(',') === '3,4,5'
    && [p1, p2, p3].every((p) => p.entidad.entityType === 'PAGE' && C.entidadDeCuentaValida(p.entidad)));
  const repetida = await C.crearPagina(bd, dados(55), { accountId: CUENTA_A, clave: 'p2', at: AHORA + 5 });
  check('50) la misma clave no abre una segunda Página', !repetida.creada && repetida.entidad.entityId === p2.entidad.entityId);
  /* Una Página retirada no devuelve su número a la rifa. */
  bd.escribir(`entities/${p2.entidad.entityId}`, { ...bd.leer(`entities/${p2.entidad.entityId}`), status: 'DELETED' });
  const p4 = await C.crearPagina(bd, dados(56), { accountId: CUENTA_A, clave: 'p4', at: AHORA + 10 });
  check('51) y si una se retira, su secuencia no se reutiliza', p4.entidad.entitySequence === 6);
  /*
   * Diez Páginas a la vez se estorban entre ellas: todas leen y escriben el
   * contador de la MISMA cuenta. Con el presupuesto de cinco intentos del SDK
   * algunas se quedarían fuera, así que aquí se mide con presupuesto amplio y
   * se cuenta cuánto cuesta. Es contención de una cuenta, no global: las
   * Páginas de otra cuenta no se enteran.
   */
  bd.maxIntentos = 200;
  const abortosAntes = bd.abortos;
  const aLaVez = await Promise.all(Array.from({ length: 10 }, (_, i) => C.crearPagina(bd, dados(60 + i), { accountId: CUENTA_A, clave: `lote${i}`, at: AHORA })));
  const secuencias = aLaVez.map((p) => p.entidad.entitySequence).sort((a, b) => a - b);
  check('52) diez Páginas a la vez reciben diez secuencias distintas y seguidas',
    new Set(secuencias).size === 10 && secuencias[9] - secuencias[0] === 9,
    `${secuencias.join(',')} · ${bd.abortos - abortosAntes} reintentos por contender en la misma cuenta`);
  check('53) la cara Weë sigue teniendo su sitio aunque haya Páginas antes',
    (await C.asegurarEntidadDeCaraWee(bd, dados(70), { accountId: CUENTA_A, perfilUid: `hidi_${CUENTA_A}`, at: AHORA })).entidad.entitySequence === 2);
  check('54) sin clave de idempotencia no se crea ninguna',
    (await lanza(() => C.crearPagina(bd, dados(71), { accountId: CUENTA_A, clave: '', at: AHORA }))) !== null);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Principal → cuenta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new BaseDeMentira();
  await C.asegurarCuenta(bd, dados(81), { principalId: CUENTA_A, at: AHORA });
  const consulta = bd.consulta();
  const propia = await C.resolverCuentaDelPrincipal(consulta, { principalId: CUENTA_A });
  check('55) sin pedir cuenta, la suya, como dueño', propia.accountId === CUENTA_A && propia.role === 'OWNER' && propia.propia);
  check('56) pedir la de otro sin membresía no resuelve nada',
    (await C.resolverCuentaDelPrincipal(consulta, { principalId: CUENTA_B, cuentaSolicitada: CUENTA_A })) === null);
  const membresia = { contract: C.ACCOUNT_IDENTITY_CONTRACT_VERSION, accountId: CUENTA_A, principalId: CUENTA_B, role: 'FINANCE', status: 'ACTIVE', createdAt: AHORA, updatedAt: AHORA };
  bd.escribir(`accounts/${CUENTA_A}/members/${CUENTA_B}`, membresia);
  const invitado = await C.resolverCuentaDelPrincipal(consulta, { principalId: CUENTA_B, cuentaSolicitada: CUENTA_A });
  check('57) con membresía activa, resuelve con el papel que diga la membresía',
    invitado.accountId === CUENTA_A && invitado.role === 'FINANCE' && !invitado.propia);
  bd.escribir(`accounts/${CUENTA_A}/members/${CUENTA_B}`, { ...membresia, status: 'REVOKED' });
  check('58) una membresía retirada deja de resolver',
    (await C.resolverCuentaDelPrincipal(consulta, { principalId: CUENTA_B, cuentaSolicitada: CUENTA_A })) === null);
  check('59) y un principal con forma inválida nunca resuelve',
    (await C.resolverCuentaDelPrincipal(consulta, { principalId: `hidi_${CUENTA_A}` })) === null
    && (await C.resolverCuentaDelPrincipal(consulta, { principalId: CUENTA_B, cuentaSolicitada: '000123456' })) === null);
  check('60) la puerta es una sola: el Core no tiene otra forma de responder a esto',
    (leer('functions/src/core/account-identity.ts').match(/export const resolverCuentaDelPrincipal/g) || []).length === 1);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── I · Buscar por número ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new BaseDeMentira();
  const { cuenta } = await C.asegurarCuenta(bd, dados(91), { principalId: CUENTA_A, at: AHORA });
  const consulta = bd.consulta();
  check('61) el número lleva a su cuenta, escrito como sea', (await C.buscarCuentaPorNumero(consulta, cuenta.accountNumber)) === CUENTA_A
    && (await C.buscarCuentaPorNumero(consulta, C.formatearNumeroDeCuenta(cuenta.accountNumber))) === CUENTA_A);
  check('62) un número que no existe no lleva a ninguna parte', (await C.buscarCuentaPorNumero(consulta, '000100001')) === null);
  check('63) ni uno mal escrito', (await C.buscarCuentaPorNumero(consulta, cuenta.accountNumber.slice(1))) === null
    && (await C.buscarCuentaPorNumero(consulta, null)) === null);
  check('64) saber el número NO da permiso: resolverlo no devuelve membresía ni papel',
    (await C.resolverCuentaDelPrincipal(consulta, { principalId: CUENTA_B, cuentaSolicitada: CUENTA_A })) === null);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── J · Privacidad ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new BaseDeMentira();
  const { cuenta, entidadReal } = await C.asegurarCuenta(bd, dados(101), { principalId: CUENTA_A, at: AHORA });
  const publica = C.vistaPublicaDeEntidad(entidadReal);
  check('65) lo que puede salir de una entidad es su id opaco, su tipo y su estado',
    JSON.stringify(Object.keys(publica).sort()) === JSON.stringify(['entityId', 'entityType', 'status']));
  check('66) fuera quedan la cuenta dueña, el número y la secuencia',
    !('ownerAccountId' in publica) && !('entitySequence' in publica) && !JSON.stringify(publica).includes(cuenta.accountNumber)
    && !JSON.stringify(publica).includes(CUENTA_A));
  check('67) del número de una cuenta no se deduce su identificador, ni al revés',
    !cuenta.accountNumber.includes(CUENTA_A) && !entidadReal.entityId.includes(cuenta.accountNumber));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── K · Lo cerrado sigue encajando ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new BaseDeMentira();
  const a = await C.asegurarCuenta(bd, dados(111), { principalId: CUENTA_A, at: AHORA });
  const b = await C.asegurarCuenta(bd, dados(112), { principalId: CUENTA_B, at: AHORA });

  /* La billetera del Financial Core toma el número de la cuenta y no guarda otro. */
  const cuentaFinanciera = {
    contract: '1.0', accountId: a.cuenta.accountId, accountNumber: a.cuenta.accountNumber, revision: 3, status: 'ACTIVE',
    credits: 240, currency: 'PEN', lifetime: { granted: 240, purchased: 0, consumed: 0, refunded: 0, adjusted: 0 },
    createdAt: AHORA, updatedAt: AHORA,
  };
  const billetera = financiero.billeteraDe(cuentaFinanciera);
  check('68) una cuenta, una billetera, y su número es el de la cuenta',
    billetera.walletNumber === a.cuenta.accountNumber && billetera.accountId === a.cuenta.accountId
    && billetera.walletNumber.length === 9 && !('walletNumber' in cuentaFinanciera));
  check('69) el Financial Core toma el número de la cuenta y no guarda otro',
    C.esNumeroDeCuentaCanonico(a.cuenta.accountNumber)
    && identidad.esNumeroDeCuenta === undefined
    && /NumeroDeCuenta/.test(leer('functions/src/core/financial/account.ts')));

  /* Un gasto atribuido a una entidad: el saldo sigue siendo de la cuenta. */
  const motor = financiero.crearMotorDeCredits();
  const decision = motor.mover(cuentaFinanciera, {
    contract: '1.0', principal: { userId: a.cuenta.accountId }, at: AHORA, type: 'usage', amount: 10,
    reason: 'Weë Studio', source: 'creator', idempotencyKey: 'sonda_11x5_1',
    attribution: { entityId: a.entidadReal.entityId, entityType: 'REAL_PROFILE', appId: 'studio' },
  });
  check('70) un gasto se atribuye a la entidad que actuó y se cobra a la cuenta',
    decision.status === 'applied' && decision.entry.accountId === a.cuenta.accountId
    && decision.entry.attribution.entityId === a.entidadReal.entityId && decision.entry.amount === -10);
  check('71) el identificador opaco de una entidad cabe en la atribución sin tocar el contrato',
    decision.entry.attribution.entityType === 'REAL_PROFILE' && decision.account.credits === 230);

  /* Un traspaso entre dos cuentas resueltas por su número. */
  const consulta = bd.consulta();
  const destino = await C.buscarCuentaPorNumero(consulta, b.cuenta.accountNumber);
  const receptor = { ...cuentaFinanciera, accountId: destino, accountNumber: b.cuenta.accountNumber, credits: 0, revision: 0 };
  const plan = financiero.planearTransferencia(cuentaFinanciera, receptor, {
    contract: '1.0', principal: { userId: a.cuenta.accountId }, at: AHORA, transferId: 'sonda_transfer_1',
    recipientAccountId: destino, amount: 50, idempotencyKey: 'sonda_transfer_1',
  });
  check('72) un traspaso se planea entre las dos cuentas, con dos asientos y sin billeteras nuevas',
    plan.status === 'planned' && plan.debit.entry.accountId === a.cuenta.accountId
    && plan.credit.entry.accountId === destino && plan.debit.entry.amount === -50 && plan.credit.entry.amount === 50);
  check('73) y el emisor sale del principal, no de lo que diga la petición', !('senderAccountId' in plan.transfer) || plan.transfer.senderAccountId === a.cuenta.accountId);

  /* Multiproducto: la cuenta no sabe de productos; el producto viaja en la atribución. */
  check('74) la cuenta no guarda producto alguno',
    !['appId', 'product', 'workspaceId', 'producto'].some((k) => k in a.cuenta));
  const otroProducto = motor.mover({ ...cuentaFinanciera, credits: 100 }, {
    contract: '1.0', principal: { userId: a.cuenta.accountId }, at: AHORA, type: 'usage', amount: 5,
    reason: 'Weë Chef', source: 'creator', idempotencyKey: 'sonda_11x5_2', attribution: { appId: 'chef', workspaceId: 'w1' },
  });
  check('75) el mismo saldo sirve a otro producto', otroProducto.status === 'applied' && otroProducto.entry.attribution.appId === 'chef');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── L · Lo cableado y lo que sigue sin cablearse ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const indice = leer('functions/src/index.ts');
  const composicion = leer('functions/src/identity/cuentas.ts');
  const nucleo = leer('functions/src/core/account-identity.ts');
  check('76) el nacimiento de las cuentas NUEVAS sí está cableado, y por un disparador de creación',
    /nacimientoDeCuenta/.test(indice)
    && /onDocumentCreated\(\s*\{ document: 'users\/\{perfilId\}'/.test(leer('functions/src/identity/nacimiento.ts')));
  check('77) la composición sigue sin exponer callables: quien dispara es el nacimiento',
    !/onCall|onDocumentCreated|onRequest|onSchedule/.test(composicion));
  check('78) el Core nuevo no lee el reloj ni tira dados: los recibe',
    !/Date\.now\(|Math\.random\(|new Date\(/.test(nucleo) && /export interface Azar/.test(nucleo));
  check('79) el seam de la Fase 11.x-2 se retiró entero, y su composición ya no existe',
    identidad.asegurarIdentidadDeCuenta === undefined && identidad.nacerCuenta === undefined
    && identidad.numeroDeCuentaDesde === undefined && identidad.identificadorDeEntidad === undefined
    && !fs.existsSync(path.resolve(here, '../src/identity/index.ts')));
  check('80) y la migración de las cuentas que ya existen no está escrita',
    !fs.existsSync(path.resolve(here, '../../scripts/migrar-identidad.mjs')));

  /*
   * LA CERRADURA QUE IMPIDE QUE ESTO SEA UNA MIGRACIÓN. Un disparador de
   * creación no despierta con los documentos que ya están escritos, y además el
   * nacimiento se niega explícitamente a crear la cuenta de una cara Weë cuya
   * cuenta no haya nacido: eso es numerar una cuenta que ya existe.
   */
  const nacimiento = leer('functions/src/identity/nacimiento.ts');
  check('81) una cara Weë NUNCA hace nacer una cuenta', (() => {
    const codigo = sinComentarios(nacimiento);
    /* La cuenta se pregunta antes, y si no ha nacido, ahí se acaba. */
    const preguntaAntes = /const cuenta = await cuentaDeWee\(db, decision\.accountId\);/.test(codigo)
      && /if \(!cuenta\)[\s\S]{0,200}?hecho: 'NADA'/.test(codigo);
    /* Y la única llamada que hace nacer una cuenta cuelga de NACER_LA_CUENTA. */
    const soloUnNacimiento = (codigo.match(/asegurarCuentaEnWee\(/g) || []).length === 1
      && /decision\.accion === 'NACER_LA_CUENTA'[\s\S]{0,300}?asegurarCuentaEnWee\(/.test(codigo);
    return preguntaAntes && soloUnNacimiento;
  })());
  check('82) el Core NO conoce la identidad heredada: la frontera está fuera y es un solo archivo',
    !/hidi/i.test(nucleo) && !/hidi/i.test(leer('functions/src/core/identity.ts'))
    && /hidi/.test(leer('functions/src/identity/compatibilidad.ts'))
    && !/hidi/i.test(composicion));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
