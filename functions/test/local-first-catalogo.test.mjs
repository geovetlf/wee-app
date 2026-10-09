/**
 * LÍNEA B1 (local-first) · catálogo local sobre el almacén de MEMORIA.
 *
 * Cubre lo que pide el brief: crear y reabrir, archivo ausente, espacio
 * insuficiente sin estado a medias, reintento, duplicar, eliminar, índice
 * corrupto con cuarentena (nada borrado), esquema más nuevo (no se toca),
 * migración hacia delante, escritura interrumpida y concurrencia.
 *
 * Cargador: `_cargador-local-first.mjs` (transpila los .ts con el `typescript` de functions/).
 *
 *   node functions/test/local-first-catalogo.test.mjs
 */
import crypto from 'node:crypto';
import { importarFuente } from './_cargador-local-first.mjs';

const { abrirCatalogoLocal, CLAVE_DEL_INDICE, ESQUEMA_DEL_INDICE } = await importarFuente('utils/catalogoLocal.ts');
const { crearAlmacenMemoria } = await importarFuente('services/almacenLocal/memoria.ts');
const { ErrorAlmacenLocal } = await importarFuente('services/almacenLocal/tipos.ts');

let fallos = 0;
const check = (nombre, cond, extra = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
};

const bytesDe = (texto) => new TextEncoder().encode(texto);
const textoDe = (datos) => new TextDecoder().decode(datos);
const sha = (texto) => crypto.createHash('sha256').update(texto).digest('hex');
/** Código del error (del catálogo o del almacén), o `no_tipado` con el mensaje; null si no hubo error. */
const codigoDe = async (promesa) => {
  try {
    await promesa;
    return null;
  } catch (error) {
    return error?.codigo ?? `no_tipado: ${error?.message}`;
  }
};
const reloj = () => {
  let t = 1_700_000_000_000;
  return () => (t += 1000);
};
const generadorDeIds = (prefijo) => {
  let n = 0;
  return () => `${prefijo}${String(++n).padStart(4, '0')}`;
};
/** Abre el catálogo sobre `respaldo`. Cada apertura usa su propio prefijo de identificadores. */
const abrir = (respaldo, { prefijo = 'x', almacen = {} } = {}) =>
  abrirCatalogoLocal(crearAlmacenMemoria(respaldo, almacen), { ahora: reloj(), nuevoId: generadorDeIds(prefijo) });
const clavesDe = (respaldo) => [...respaldo.keys()].sort().join('|');
const clavesDelProyecto = (respaldo, projectId) => [...respaldo.keys()].filter((k) => k.startsWith(`proyectos/${projectId}/`));

/* A. Crear, normalizar y reabrir. */
const respaldo = new Map();
const c1 = await abrir(respaldo, { prefijo: 'a' });
const p = await c1.crearProyecto({ name: '  Mi   restaurante ', emoji: '🍔' });
const r = await c1.añadirRecurso(p.projectId, { nombre: 'logo.txt', tipo: 'texto', mimeType: 'text/plain', datos: bytesDe('logo v1') });
const c2 = await abrir(respaldo, { prefijo: 'b' });
const listaA = c2.proyectos();
check('A1) un proyecto creado sigue listado tras reabrir', listaA.length === 1 && listaA[0].projectId === p.projectId);
check('A2) el nombre se normaliza (espacios) y el itemCount es 1', listaA[0].name === 'Mi restaurante' && listaA[0].itemCount === 1, listaA[0].name);
check('A3) el archivo se lee tras reabrir y coincide byte a byte', textoDe(await c2.leerRecurso(p.projectId, r.recursoId)) === 'logo v1');
check('A4) reabrir un catálogo sano no emite avisos', c2.avisos.length === 0, JSON.stringify(c2.avisos));

/* B. Renombrar persiste en el índice y en la copia del proyecto. */
await c2.renombrar(p.projectId, 'Mi restaurante 2');
const c3 = await abrir(respaldo, { prefijo: 'c' });
const copiaB = JSON.parse(textoDe(respaldo.get(`proyectos/${p.projectId}/proyecto.json`)));
check('B1) renombrar persiste tras reabrir', c3.proyecto(p.projectId)?.name === 'Mi restaurante 2');
check('B2) la copia de recuperación del proyecto también se actualiza', copiaB.name === 'Mi restaurante 2');

/* C. Duplicar: identificador nuevo, copia de archivos y relación con el original. */
const copia = await c3.duplicar(p.projectId, 'Copia de Mi restaurante');
check('C1) el duplicado tiene un identificador nuevo', copia.projectId !== p.projectId);
check('C2) el duplicado copia el archivo y lo relaciona con el original (derivadoDe)', copia.recursos.length === 1 && copia.recursos[0].derivadoDe === r.recursoId && copia.recursos[0].recursoId !== r.recursoId);
check('C3) los bytes del duplicado son iguales a los del original', textoDe(await c3.leerRecurso(copia.projectId, copia.recursos[0].recursoId)) === 'logo v1');
check('C4) el original no cambia: sigue con su archivo y son dos proyectos', textoDe(await c3.leerRecurso(p.projectId, r.recursoId)) === 'logo v1' && c3.proyectos().length === 2);

/* D. Eliminar del dispositivo: sale del índice y se borran sus archivos. */
await c3.eliminar(copia.projectId);
check('D1) eliminar quita el proyecto del índice', c3.proyecto(copia.projectId) === null);
check('D2) eliminar borra sus archivos del almacén', clavesDelProyecto(respaldo, copia.projectId).length === 0, clavesDelProyecto(respaldo, copia.projectId).join(','));
const c4 = await abrir(respaldo, { prefijo: 'd' });
check('D3) tras reabrir sigue eliminado y el original intacto', c4.proyecto(copia.projectId) === null && c4.proyectos().length === 1);

/* E. Archivo ausente: se detecta al abrir y se puede recuperar si vuelve. */
const claveDelArchivo = `proyectos/${p.projectId}/recursos/${r.recursoId}`;
const contenidoDelArchivo = respaldo.get(claveDelArchivo);
respaldo.delete(claveDelArchivo);
const c5 = await abrir(respaldo, { prefijo: 'e' });
check('E1) un archivo que falta al abrir se marca ausente', c5.proyecto(p.projectId).recursos[0].estado === 'ausente', c5.proyecto(p.projectId).recursos[0].estado);
check('E2) leer un archivo ausente lanza no_encontrado (no devuelve nada)', (await codigoDe(c5.leerRecurso(p.projectId, r.recursoId))) === 'no_encontrado');
respaldo.set(claveDelArchivo, contenidoDelArchivo);
const reparados = await c5.marcarAusentes();
check('E3) marcarAusentes devuelve 1 cambio y el archivo vuelve a local', reparados === 1 && c5.proyecto(p.projectId).recursos[0].estado === 'local', String(reparados));

/* F. Archivo corrupto: mismo tamaño y otro contenido se detecta por hash. */
respaldo.set(claveDelArchivo, bytesDe('logo v9'));
const estadoCorrupto = await c5.verificarRecurso(p.projectId, r.recursoId);
check('F1) un archivo con otro contenido se marca corrupto (hash)', estadoCorrupto === 'corrupto', estadoCorrupto);
check('F2) leer un archivo corrupto lanza corrupto (no devuelve bytes falsos)', (await codigoDe(c5.leerRecurso(p.projectId, r.recursoId))) === 'corrupto');
respaldo.set(claveDelArchivo, contenidoDelArchivo);
check('F3) al restaurar el contenido, verificar devuelve local', (await c5.verificarRecurso(p.projectId, r.recursoId)) === 'local');

/* G. Espacio insuficiente: nada a medias. */
const respaldoG = new Map();
const cG = await abrir(respaldoG, { prefijo: 'g', almacen: { capacidad: 2000 } });
const pG = await cG.crearProyecto({ name: 'Espacio' });
const indiceAntesG = textoDe(respaldoG.get(CLAVE_DEL_INDICE));
const clavesAntesG = clavesDe(respaldoG);
check('G1) añadir algo que no cabe lanza sin_espacio', (await codigoDe(cG.añadirRecurso(pG.projectId, { nombre: 'grande.bin', tipo: 'otro', datos: new Uint8Array(3000) }))) === 'sin_espacio');
check('G2) sin_espacio no cambia el índice ni deja archivos', textoDe(respaldoG.get(CLAVE_DEL_INDICE)) === indiceAntesG && clavesDe(respaldoG) === clavesAntesG);

/* G3. Duplicar cuando solo cabe la primera copia de dos archivos. */
const respaldoG2 = new Map();
const cG2 = await abrir(respaldoG2, { prefijo: 'h' });
const pG2 = await cG2.crearProyecto({ name: 'Dos' });
await cG2.añadirRecurso(pG2.projectId, { nombre: 'a', tipo: 'otro', datos: new Uint8Array(700) });
await cG2.añadirRecurso(pG2.projectId, { nombre: 'b', tipo: 'otro', datos: new Uint8Array(700) });
const ocupado = [...respaldoG2.values()].reduce((suma, datos) => suma + datos.byteLength, 0);
const cG3 = await abrir(respaldoG2, { prefijo: 'i', almacen: { capacidad: ocupado + 1000 } });
const clavesAntesDup = clavesDe(respaldoG2);
check('G3) duplicar sin espacio para la segunda copia lanza sin_espacio', (await codigoDe(cG3.duplicar(pG2.projectId, 'Copia'))) === 'sin_espacio');
check('G4) la primera copia que sí cabía se revierte: mismas claves, un solo proyecto', clavesDe(respaldoG2) === clavesAntesDup && cG3.proyectos().length === 1);

/* H. Reintento tras un fallo transitorio. */
let fallaUnaVez = true;
const respaldoH = new Map();
const cH = await abrir(respaldoH, {
  prefijo: 'j',
  almacen: {
    antesDe: (paso, clave) => {
      if (fallaUnaVez && paso === 'escribir-temporal' && clave.includes('/recursos/')) {
        fallaUnaVez = false;
        throw new ErrorAlmacenLocal('no_disponible', 'transitorio');
      }
    },
  },
});
const pH = await cH.crearProyecto({ name: 'Reintento' });
check('H1) el fallo transitorio llega tipado (no_disponible)', (await codigoDe(cH.añadirRecurso(pH.projectId, { nombre: 'x', tipo: 'otro', datos: bytesDe('x') }))) === 'no_disponible');
check('H2) tras el fallo el recurso no aparece en el índice', cH.proyecto(pH.projectId).recursos.length === 0);
await cH.añadirRecurso(pH.projectId, { nombre: 'x', tipo: 'otro', datos: bytesDe('x') });
check('H3) el reintento funciona y queda un recurso', cH.proyecto(pH.projectId).recursos.length === 1);

/* I. Corte en mitad de la escritura del índice al crear. */
const respaldoI = new Map();
const cI1 = await abrir(respaldoI, { prefijo: 'k' });
await cI1.crearProyecto({ name: 'Estable' });
const indiceEstable = textoDe(respaldoI.get(CLAVE_DEL_INDICE));
const cI2 = await abrir(respaldoI, {
  prefijo: 'l',
  almacen: {
    antesDe: (paso, clave) => {
      if (paso === 'renombrar' && clave === CLAVE_DEL_INDICE) throw new Error('corte');
    },
  },
});
check('I1) un corte en el índice aborta la creación', (await codigoDe(cI2.crearProyecto({ name: 'Se corta' }))) === 'no_tipado: corte');
check('I2) el índice sigue siendo el de antes del corte', textoDe(respaldoI.get(CLAVE_DEL_INDICE)) === indiceEstable);
check('I3) la copia del proyecto que se cortó se revierte (no queda huérfana)', ![...respaldoI.values()].some((datos) => textoDe(datos).includes('Se corta')));
const cI3 = await abrir(respaldoI, { prefijo: 'm' });
check('I4) al reabrir: el catálogo es el estable y no quedan temporales', cI3.proyectos().length === 1 && cI3.proyectos()[0].name === 'Estable' && ![...respaldoI.keys()].some((k) => k.endsWith('.tmp')));

/* J. Índice corrupto: cuarentena, reconstrucción desde las copias y nada borrado. */
const respaldoJ = new Map();
const cJ1 = await abrir(respaldoJ, { prefijo: 'n' });
const pJ = await cJ1.crearProyecto({ name: 'Sobrevive' });
const rJ = await cJ1.añadirRecurso(pJ.projectId, { nombre: 'a.txt', tipo: 'texto', datos: bytesDe('contenido a') });
const proyectosAntesJ = [...respaldoJ.keys()].filter((k) => k.startsWith('proyectos/')).sort().join('|');
respaldoJ.set(CLAVE_DEL_INDICE, bytesDe('{no es json'));
const cJ2 = await abrir(respaldoJ, { prefijo: 'o' });
check('J1) un índice corrupto deja los avisos de cuarentena y reconstrucción', cJ2.avisos.includes('indice_en_cuarentena') && cJ2.avisos.includes('indice_reconstruido'), JSON.stringify(cJ2.avisos));
check('J2) el proyecto se reconstruye desde su copia, con el mismo nombre', cJ2.proyectos().length === 1 && cJ2.proyectos()[0].name === 'Sobrevive');
const cuarentenaJ = [...respaldoJ.keys()].filter((k) => k.startsWith('cuarentena/'));
check('J3) el índice corrupto queda en cuarentena, byte a byte', cuarentenaJ.length === 1 && textoDe(respaldoJ.get(cuarentenaJ[0])) === '{no es json');
check('J4) no se borró ningún archivo de los proyectos', [...respaldoJ.keys()].filter((k) => k.startsWith('proyectos/')).sort().join('|') === proyectosAntesJ);
check('J5) el archivo se sigue leyendo tras la reconstrucción', textoDe(await cJ2.leerRecurso(pJ.projectId, rJ.recursoId)) === 'contenido a');

/* K. Esquema más nuevo: solo lectura, nada se toca. */
const respaldoK = new Map();
const cK1 = await abrir(respaldoK, { prefijo: 'p' });
await cK1.crearProyecto({ name: 'Futuro' });
const indiceFuturo = bytesDe(JSON.stringify({ esquema: ESQUEMA_DEL_INDICE + 1, proyectos: [], nuevoCampo: true }));
respaldoK.set(CLAVE_DEL_INDICE, indiceFuturo);
const clavesK = clavesDe(respaldoK);
const cK2 = await abrir(respaldoK, { prefijo: 'q' });
check('K1) un esquema más nuevo abre en solo lectura y lo avisa', cK2.modoLectura === true && cK2.avisos.includes('esquema_mas_nuevo'));
check('K2) el índice nuevo y las claves no se tocan', textoDe(respaldoK.get(CLAVE_DEL_INDICE)) === textoDe(indiceFuturo) && clavesDe(respaldoK) === clavesK);
check('K3) escribir en solo lectura lanza solo_lectura', (await codigoDe(cK2.crearProyecto({ name: 'x' }))) === 'solo_lectura');

/* L. Migración hacia delante desde el esquema 0 sintético. */
const respaldoL = new Map();
const legado = {
  esquema: 0,
  proyectos: [{ projectId: 'legado01', name: 'Antiguo', emoji: '🏷️', createdAt: 1, updatedAt: 2, recursos: [{ recursoId: 'rec0001', nombre: 'v.txt', tipo: 'texto', mimeType: 'text/plain', tamano: 4, sha256: sha('hola'), creadoEn: 1, modificadoEn: 2 }] }],
};
respaldoL.set(CLAVE_DEL_INDICE, bytesDe(JSON.stringify(legado)));
respaldoL.set('proyectos/legado01/recursos/rec0001', bytesDe('hola'));
const cL = await abrir(respaldoL, { prefijo: 'r' });
check('L1) un índice de esquema 0 se migra y lo avisa', cL.avisos.includes('migrado'), JSON.stringify(cL.avisos));
check('L2) la copia del esquema anterior queda en cuarentena', [...respaldoL.keys()].some((k) => k.startsWith('cuarentena/esquema-0-')));
const migrado = cL.proyecto('legado01');
check('L3) el proyecto migrado tiene carátula, respaldo, estado de archivo e itemCount', migrado !== null && migrado.caratula.estado === 'sin_caratula' && migrado.recursos[0].estado === 'local' && migrado.respaldo === 'ninguno' && migrado.itemCount === 1);
check('L4) el índice queda en el esquema actual', JSON.parse(textoDe(respaldoL.get(CLAVE_DEL_INDICE))).esquema === ESQUEMA_DEL_INDICE);

/* M. Archivos huérfanos (sin proyecto en el índice): se retiran al abrir con índice fiable. */
const respaldoM = new Map();
const cM1 = await abrir(respaldoM, { prefijo: 's' });
await cM1.crearProyecto({ name: 'Con huérfano' });
respaldoM.set('proyectos/fantasma01/recursos/r1', bytesDe('huérfano'));
await abrir(respaldoM, { prefijo: 't' });
check('M1) un archivo sin proyecto en el índice se retira al abrir (índice fiable)', ![...respaldoM.keys()].some((k) => k.startsWith('proyectos/fantasma01/')));

/* N. Carátula: regenerable y marcada como ausente si falta. */
const respaldoN = new Map();
const cN = await abrir(respaldoN, { prefijo: 'v' });
const pN = await cN.crearProyecto({ name: 'Con carátula' });
await cN.regenerarCaratula(pN.projectId, bytesDe('miniatura'));
check('N1) regenerar la carátula la deja presente', cN.proyecto(pN.projectId).caratula.estado === 'presente');
respaldoN.delete(`proyectos/${pN.projectId}/caratula`);
const cambiosN = await cN.marcarAusentes();
check('N2) una carátula que falta se marca ausente, no se toma como verdad', cambiosN === 1 && cN.proyecto(pN.projectId).caratula.estado === 'ausente', String(cambiosN));

/* P. Concurrencia: operaciones a la vez no se pisan. */
const respaldoP = new Map();
const cP = await abrir(respaldoP, { prefijo: 'u' });
const pP = await cP.crearProyecto({ name: 'Concurrente' });
await Promise.all([
  cP.añadirRecurso(pP.projectId, { nombre: 'a', tipo: 'otro', datos: bytesDe('a') }),
  cP.añadirRecurso(pP.projectId, { nombre: 'b', tipo: 'otro', datos: bytesDe('b') }),
  cP.renombrar(pP.projectId, 'Concurrente 2'),
]);
check('P1) dos altas y un renombrado a la vez no se pisan', cP.proyecto(pP.projectId).recursos.length === 2 && cP.proyecto(pP.projectId).name === 'Concurrente 2');

/* Q. Validación de la entrada: nada inválido llega al índice. */
check('Q1) un nombre vacío lanza nombre_no_valido', (await codigoDe(cP.crearProyecto({ name: '   ' }))) === 'nombre_no_valido');
check('Q2) un tipo desconocido lanza tipo_no_valido y no se guarda', (await codigoDe(cP.añadirRecurso(pP.projectId, { nombre: 'x', tipo: 'raro', datos: bytesDe('x') }))) === 'tipo_no_valido' && cP.proyecto(pP.projectId).recursos.length === 2);

/* R. Exportar: todo o nada. */
const exportacion = await cP.leerParaExportar(pP.projectId);
check('R1) exportar devuelve todos los archivos con sus bytes', exportacion.archivos.length === 2 && textoDe(exportacion.archivos[0].datos) === 'a');
respaldoP.delete(`proyectos/${pP.projectId}/recursos/${exportacion.archivos[0].recurso.recursoId}`);
check('R2) exportar con un archivo que falta no produce un paquete a medias', (await codigoDe(cP.leerParaExportar(pP.projectId))) === 'archivo_no_disponible');

/* S. Sin índice ni copias: catálogo vacío y sin avisos. */
const cS = await abrir(new Map(), { prefijo: 'w' });
check('S1) un almacén vacío abre sin proyectos y sin avisos', cS.proyectos().length === 0 && cS.avisos.length === 0 && cS.modoLectura === false);
const estadoS = await cS.estado();
check('S2) estado() informa plataforma, espacio desconocido y modo', estadoS.plataforma === 'memoria' && estadoS.espacioLibre === null && estadoS.modoLectura === false);

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
