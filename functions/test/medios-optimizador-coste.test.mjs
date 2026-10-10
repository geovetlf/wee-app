/**
 * MC-4 · OPTIMIZADOR DE MEDIOS — ESTIMACIÓN DE COSTE SIN TARIFAS APROBADAS.
 *
 * La regla que se prueba: sin una tarifa aprobada, la estimación NO tiene importes.
 * Las mediciones se construyen con los helpers reales de MC-7 (`usoDeLectura`,
 * `usoDeEscritura`, `usoDeOperacion`, `usoDeNivel`), así que tienen la forma que el
 * medidor produce de verdad.
 *
 *   A · La medición: cada operación se cuenta una vez, y los niveles no se suman en el tiempo.
 *   B · Sin tarifa: `sin_tarifa` y ningún importe, ni un cero que lo parezca.
 *   C · Con una tarifa de PRUEBA inyectada: el cálculo es el correcto.
 *   D · Lo que no tiene tarifa queda desconocido, y el total no se inventa.
 *   E · El redondeo es el declarado por MC-7 (al más cercano, una sola vez por línea).
 *   F · Monedas mezcladas: no hay total.
 *   G · Las mediciones sin forma válida se cuentan como descartadas.
 *   H · Determinismo y entrada intacta.
 *   I · Pureza: el módulo no importa nada de Credits ni llama a servicios.
 *
 * Ninguna tarifa de este fichero es real. Son valores de prueba inyectados.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const coste = lib('media/optimizador/coste.js');
const mc7 = lib('core/media/uso.js');

let n = 0;
let failures = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ANCLA = { attemptId: 'intento-de-prueba' };
const base = (operacion, occurredAt = 1_000, accountId = 'cuenta-de-prueba', providerId = 'proveedor-de-prueba') =>
  ({ accountId, providerId, operacion, occurredAt, ancla: ANCLA });

/* Una medición realista de un ciclo: lectura, escritura, procesado, referencia, reconciliación y copia. */
const ciclo = () => [
  ...mc7.usoDeLectura(base('object.get', 1_000), 1_000),
  ...mc7.usoDeEscritura(base('object.put', 2_000), 500),
  ...mc7.usoDeOperacion(base('object.head', 3_000)),
  ...mc7.usoDeOperacion(base('object.list', 4_000)),
  ...mc7.usoDeOperacion(base('object.copy', 5_000)),
  { ...base('process.run', 6_000), metrica: 'segundos_de_proceso', unidad: 'segundo', cantidad: 3 },
];

/* ═══ A · LA MEDICIÓN ═══════════════════════════════════════════════════════ */
console.log('\n── A · La medición resumida ──');
const usosCiclo = ciclo();
const med = coste.medirUsos(usosCiclo);
check('A · los bytes transferidos son lectura más escritura (1000 + 500)', med.bytesTransferidos === 1500, `${med.bytesTransferidos}`);
check('A · cada operación se cuenta una vez: 5 operaciones con hecho propio (get, put, head, list, copy)',
  med.operacionesTotales === 5, `operacionesTotales=${med.operacionesTotales}`);
check('A · una ejecución del procesador cuenta una operación de procesado', med.operacionesDeProcesamiento === 1, `${med.operacionesDeProcesamiento}`);
check('A · la consulta de referencia (head) se cuenta como referencia', med.operacionesDeReferencia === 1);
check('A · el listado se cuenta como reconciliación', med.operacionesDeReconciliacion === 1);
check('A · la copia se cuenta como copia de respaldo', med.copiasDeRespaldo === 1);
check('A · los segundos de proceso se suman como cantidad (3)', med.segundosDeProceso === 3);

/* `usoDeNivel` devuelve UN hecho (la foto de un nivel), no una lista. */
const niveles = [
  mc7.usoDeNivel(base('object.head', 10_000), 'bytes_almacenados', 4_000, '2026-10'),
  mc7.usoDeNivel(base('object.head', 20_000), 'bytes_almacenados', 9_000, '2026-10'),
];
const medNiveles = coste.medirUsos(niveles);
check('A · un nivel no se suma en el tiempo: vale el último de la cuenta (9000, no 13000)', medNiveles.bytesAlmacenados === 9000, `${medNiveles.bytesAlmacenados}`);
const otraCuenta = [...niveles, mc7.usoDeNivel(base('object.head', 30_000, 'otra-cuenta'), 'bytes_almacenados', 1_000, '2026-10')];
check('A · dos cuentas distintas sí se suman (9000 + 1000)', coste.medirUsos(otraCuenta).bytesAlmacenados === 10_000);

/* ═══ B · SIN TARIFA ════════════════════════════════════════════════════════ */
console.log('\n── B · Sin tarifa aprobada ──');
const sinTarifa = coste.estimarCosteDeMedios({ usos: usosCiclo });
check('B · sin tarifas el estado es sin_tarifa', sinTarifa.estado === 'sin_tarifa');
check('B · sin tarifas no hay líneas ni total, y la estimación no está completa',
  sinTarifa.lineas.length === 0 && sinTarifa.total === undefined && sinTarifa.completa === false);
check('B · las cantidades medidas sí están, para que se vea qué se midió', sinTarifa.medicion.bytesTransferidos === 1500);
const planoSinTarifa = JSON.stringify(sinTarifa);
check('B · ninguna clave de importe aparece en el resultado sin tarifa',
  !/"amountMinor"|"coste"|"importe"|"total":/.test(planoSinTarifa), planoSinTarifa.length > 0 ? 'sin claves de importe' : '');
check('B · una lista de tarifas vacía equivale a no tener ninguna', coste.estimarCosteDeMedios({ usos: usosCiclo, tarifas: [] }).estado === 'sin_tarifa');
const tarifaSinFuente = { providerId: 'proveedor-de-prueba', metrica: 'operaciones', precio: { amountMinor: 1000, currency: 'EUR' }, porCantidad: 1, base: 'operacion', fuente: '', vigenteDesde: 0 };
check('B · una tarifa sin origen declarado no se considera aprobada', coste.estimarCosteDeMedios({ usos: usosCiclo, tarifas: [tarifaSinFuente] }).estado === 'sin_tarifa');
check('B · sin usos no hay nada que valorar, y no se inventa nada', coste.estimarCosteDeMedios({ usos: [] }).estado === 'sin_tarifa');

/* ═══ C · CON UNA TARIFA DE PRUEBA INYECTADA ════════════════════════════════ */
console.log('\n── C · Cálculo con una tarifa de PRUEBA (no real) ──');
const TARIFA_OPERACIONES = {
  providerId: 'proveedor-de-prueba', metrica: 'operaciones', precio: { amountMinor: 1000, currency: 'EUR' },
  porCantidad: 1, base: 'operacion', fuente: 'tarifa de prueba del test, no es real', vigenteDesde: 0,
};
const soloOperaciones = [...mc7.usoDeOperacion(base('object.head', 1_000)), ...mc7.usoDeOperacion(base('object.head', 2_000)),
  ...mc7.usoDeOperacion(base('object.head', 3_000)), ...mc7.usoDeOperacion(base('object.head', 4_000)), ...mc7.usoDeOperacion(base('object.head', 5_000))];
const conTarifa = coste.estimarCosteDeMedios({ usos: soloOperaciones, tarifas: [TARIFA_OPERACIONES] });
check('C · con tarifa de prueba el estado es calculado', conTarifa.estado === 'calculado');
check('C · 5 operaciones a 1000 por operación son 5000', conTarifa.lineas[0]?.observacion.estado === 'estimado'
  && conTarifa.lineas[0].observacion.coste.amountMinor === 5000, JSON.stringify(conTarifa.lineas[0]?.observacion?.coste));
check('C · el total es 5000 EUR y la estimación está completa',
  conTarifa.total?.amountMinor === 5000 && conTarifa.total?.moneda === 'EUR' && conTarifa.completa === true, JSON.stringify(conTarifa.total));
check('C · la estimación se declara como estimada, con su tarifa y su origen',
  conTarifa.lineas[0].observacion.precio.fuente.startsWith('tarifa de prueba'));

/* ═══ D · LO QUE NO TIENE TARIFA QUEDA DESCONOCIDO ══════════════════════════ */
console.log('\n── D · Lo que no tiene tarifa ──');
const mixta = coste.estimarCosteDeMedios({ usos: usosCiclo, tarifas: [TARIFA_OPERACIONES] });
const lecturaSinPrecio = mixta.lineas.find((l) => l.metrica === 'bytes_leidos');
check('D · los bytes leídos sin tarifa quedan desconocidos, con su motivo', lecturaSinPrecio?.observacion.estado === 'desconocido'
  && lecturaSinPrecio.observacion.motivo === 'sin_precio');
check('D · una línea desconocida no lleva importe', lecturaSinPrecio !== undefined && lecturaSinPrecio.observacion.coste === undefined);
check('D · con una línea desconocida no hay total, y la estimación no está completa', mixta.total === undefined && mixta.completa === false);

/* ═══ E · REDONDEO ══════════════════════════════════════════════════════════ */
console.log('\n── E · Redondeo declarado ──');
const TARIFA_BYTES = { providerId: 'proveedor-de-prueba', metrica: 'bytes_leidos', precio: { amountMinor: 1, currency: 'EUR' }, porCantidad: 1000, base: 'operacion', fuente: 'tarifa de prueba del test, no es real', vigenteDesde: 0 };
const bytes2400 = mc7.usoDeLectura(base('object.get', 1_000), 2_400);
const redondeo = coste.estimarCosteDeMedios({ usos: bytes2400, tarifas: [TARIFA_BYTES] });
check('E · 2400 bytes a 1 céntimo por 1000 dan 2 (al más cercano, una vez por línea)',
  redondeo.lineas.find((l) => l.metrica === 'bytes_leidos')?.observacion.coste?.amountMinor === 2, JSON.stringify(redondeo.lineas.find((l) => l.metrica === 'bytes_leidos')?.observacion?.coste));

/* ═══ F · MONEDAS MEZCLADAS ═════════════════════════════════════════════════ */
console.log('\n── F · Monedas mezcladas ──');
const TARIFA_USD = { ...TARIFA_BYTES, precio: { amountMinor: 1, currency: 'USD' }, porCantidad: 1 };
const mezcladas = coste.estimarCosteDeMedios({ usos: [...soloOperaciones, ...bytes2400], tarifas: [TARIFA_OPERACIONES, TARIFA_USD] });
check('F · dos monedas en la misma estimación no se suman: no hay total', mezcladas.total === undefined && mezcladas.completa === false);

/* ═══ G · MEDICIONES DESCARTADAS ════════════════════════════════════════════ */
console.log('\n── G · Mediciones sin forma válida ──');
const conBasura = [...usosCiclo, { metrica: 'bytes_fantasia', cantidad: 9, providerId: 'x' }, null, 'no es una medición'];
const medBasura = coste.medirUsos(conBasura);
check('G · las mediciones sin forma se cuentan como descartadas, y no suman nada', medBasura.descartadas === 3 && medBasura.bytesTransferidos === 1500, `descartadas=${medBasura.descartadas}`);

/* ═══ H · DETERMINISMO Y ENTRADA INTACTA ════════════════════════════════════ */
console.log('\n── H · Determinismo ──');
const entrada = { usos: usosCiclo, tarifas: [TARIFA_OPERACIONES] };
const antes = JSON.stringify(entrada);
const e1 = JSON.stringify(coste.estimarCosteDeMedios(entrada));
const e2 = JSON.stringify(coste.estimarCosteDeMedios(entrada));
check('H · la misma entrada produce siempre la misma estimación', e1 === e2);
check('H · la entrada no se modifica al estimar', JSON.stringify(entrada) === antes);

/* ═══ I · PUREZA ════════════════════════════════════════════════════════════ */
console.log('\n── I · Pureza del módulo ──');
const codigo = sinComentarios(leer('functions/src/media/optimizador/coste.ts'));
const importes = [...codigo.matchAll(/^\s*import[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
check('I · no importa nada de Credits, ni del Credit Engine ni del ledger de créditos',
  importes.length > 0 && importes.every((i) => !/credit/i.test(i)), JSON.stringify(importes));
check('I · solo importa del Core de medición (sin disco, red, Firebase ni proveedores)',
  importes.every((i) => i === '../../core/media/uso'), JSON.stringify(importes));
check('I · no hay llamadas a servicios, a disco ni a Credits en el código',
  !/fetch\(|https?:|fs\.|child_process|firebase|spendCredits|refundCredits|creditsService|[Cc]reditos?\b/.test(codigo));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
