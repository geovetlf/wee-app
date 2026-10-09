/**
 * LÍNEA B1 (local-first) · contrato del almacén local, con el adaptador de MEMORIA.
 *
 * El adaptador de memoria imita la escritura atómica (temporal + renombrado) y
 * permite cortar en un punto exacto, así que estas pruebas ejercen el contrato
 * que cumplen también los adaptadores nativo y web (que no corren en Node).
 *
 * Cargador: `_cargador-local-first.mjs` (transpila los .ts con el `typescript` de functions/).
 *
 *   node functions/test/local-first-almacen.test.mjs
 */
import { importarFuente } from './_cargador-local-first.mjs';

const { crearAlmacenMemoria } = await importarFuente('services/almacenLocal/memoria.ts');
const { ErrorAlmacenLocal, validarClave } = await importarFuente('services/almacenLocal/tipos.ts');

let fallos = 0;
const check = (nombre, cond, extra = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
};
/** Código de error del almacén, o null si la promesa se cumple. */
const codigoDe = async (promesa) => {
  try {
    await promesa;
    return null;
  } catch (error) {
    return error instanceof ErrorAlmacenLocal ? error.codigo : `no_tipado: ${error?.message}`;
  }
};
const bytes = (texto) => new TextEncoder().encode(texto);
const corte = (paso, clave) => {
  throw new Error(`corte simulado en ${paso} de ${clave}`);
};

/* 1. Escribir, leer, existir y listar. */
{
  const almacen = crearAlmacenMemoria();
  await almacen.escribir('proyectos/p1/recursos/r1', bytes('hola'));
  const leido = await almacen.leer('proyectos/p1/recursos/r1');
  check('1) lo que se escribe se lee igual', new TextDecoder().decode(leido) === 'hola');
  check('2) existe y listar devuelven la clave con su tamaño', (await almacen.existe('proyectos/p1/recursos/r1')) && (await almacen.listar('proyectos/'))[0]?.tamano === 4);
}

/* 3. Leer lo que no existe: `no_encontrado`, tipado. */
check('3) leer una clave ausente lanza no_encontrado', (await codigoDe(crearAlmacenMemoria().leer('no/existe'))) === 'no_encontrado');

/* 4. Los datos se copian: cambiar el original después no cambia lo guardado. */
{
  const almacen = crearAlmacenMemoria();
  const original = bytes('abc');
  await almacen.escribir('x', original);
  original[0] = 0x5a;
  check('4) escribir copia los bytes: mutar el original no altera lo guardado', new TextDecoder().decode(await almacen.leer('x')) === 'abc');
}

/* 5. Escritura atómica: un corte entre el temporal y el renombrado NO deja el índice a medias. */
{
  const respaldo = new Map();
  const antes = crearAlmacenMemoria(respaldo);
  await antes.escribir('indice.json', bytes('versión-1'));
  const cortado = crearAlmacenMemoria(respaldo, { antesDe: (paso, clave) => (paso === 'renombrar' && clave === 'indice.json' ? corte(paso, clave) : undefined) });
  const codigo = await codigoDe(cortado.escribir('indice.json', bytes('versión-2')));
  check('5) un corte en mitad de la escritura lanza error (no se traga)', codigo === 'no_tipado: corte simulado en renombrar de indice.json', String(codigo));
  check('6) tras el corte el índice conserva la versión anterior', new TextDecoder().decode(respaldo.get('indice.json')) === 'versión-1');
  check('7) el temporal interrumpido queda en el respaldo pero NO aparece en listar', respaldo.has('indice.json.tmp') && (await antes.listar('')).every((e) => !e.clave.endsWith('.tmp')));
  check('8) limpiarTemporales borra el resto de la escritura interrumpida y devuelve 1', (await antes.limpiarTemporales()) === 1 && !respaldo.has('indice.json.tmp'));
}

/* 9. Falta de espacio: se rechaza ANTES de tocar nada. */
{
  const respaldo = new Map();
  const almacen = crearAlmacenMemoria(respaldo, { capacidad: 100 });
  await almacen.escribir('a', new Uint8Array(40));
  const claves = [...respaldo.keys()].sort().join(',');
  const codigo = await codigoDe(almacen.escribir('b', new Uint8Array(80)));
  check('9) escribir más de lo que cabe lanza sin_espacio', codigo === 'sin_espacio', String(codigo));
  check('10) sin_espacio no deja nada a medias: mismas claves, mismo contenido', [...respaldo.keys()].sort().join(',') === claves && respaldo.get('a').byteLength === 40 && !respaldo.has('b') && !respaldo.has('b.tmp'));
}

/* 11. Espacio desconocido es `null`, nunca 0. Con capacidad, se calcula. */
{
  const sinLimite = await crearAlmacenMemoria().estado();
  check('11) sin capacidad conocida el espacio libre es null (desconocido), no 0', sinLimite.espacioLibre === null && sinLimite.persistencia === 'no_garantizada');
  const conLimite = crearAlmacenMemoria(new Map(), { capacidad: 1000 });
  await conLimite.escribir('a', new Uint8Array(250));
  check('12) con capacidad conocida, el espacio libre descuenta lo ocupado', (await conLimite.estado()).espacioLibre === 750);
}

/* 13. Claves inseguras se rechazan: no hay salida del almacén. */
{
  const malas = ['../fuera', '/absoluta', 'a//b', 'a/../b', '', 'x.tmp', 'a/./b', 'con espacios'];
  const todasRechazadas = malas.every((clave) => {
    try {
      validarClave(clave);
      return false;
    } catch (error) {
      return error instanceof ErrorAlmacenLocal && error.codigo === 'desconocido';
    }
  });
  check('13) claves con ../, rutas absolutas, vacías, temporales o espacios se rechazan (desconocido)', todasRechazadas);
  check('14) claves normales pasan (proyectos/abc_1/recursos/r-2.bin)', validarClave('proyectos/abc_1/recursos/r-2.bin') === 'proyectos/abc_1/recursos/r-2.bin');
}

/* 15. Reintento: un fallo transitorio no deja nada escrito y el segundo intento funciona. */
{
  let intentos = 0;
  const respaldo = new Map();
  const almacen = crearAlmacenMemoria(respaldo, {
    antesDe: (paso, clave) => {
      if (paso === 'escribir-temporal' && clave === 'reintento' && intentos++ === 0) throw new ErrorAlmacenLocal('no_disponible', 'transitorio');
    },
  });
  const primero = await codigoDe(almacen.escribir('reintento', bytes('ok')));
  // Se mira el estado justo después del fallo, antes del reintento.
  const trasElFallo = { clave: respaldo.has('reintento'), temporal: respaldo.has('reintento.tmp') };
  const segundo = await codigoDe(almacen.escribir('reintento', bytes('ok')));
  check('15) el primer intento falla con no_disponible y no deja restos', primero === 'no_disponible' && !trasElFallo.clave && !trasElFallo.temporal, String(primero));
  check('16) el reintento escribe y deja el contenido', segundo === null && new TextDecoder().decode(respaldo.get('reintento')) === 'ok');
}

/* 17. Borrar algo que no existe no es un error. */
check('17) borrar una clave ausente es idempotente', (await codigoDe(crearAlmacenMemoria().borrar('nada'))) === null);

/* 18. «Reabrir» con el mismo respaldo lee lo que se escribió antes. */
{
  const respaldo = new Map();
  await crearAlmacenMemoria(respaldo).escribir('indice.json', bytes('persistido'));
  const reabierto = crearAlmacenMemoria(respaldo);
  check('18) una instancia nueva sobre el mismo respaldo lee lo persistido', new TextDecoder().decode(await reabierto.leer('indice.json')) === 'persistido');
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
