/**
 * LÍNEA B1 (local-first) · almacén sobre puerto de archivos: escritura atómica,
 * recuperación tras un corte, reintentos sin duplicados y las reglas de cada plataforma.
 *
 * DOBLES (ver _dobles-local-first.mjs): el disco real de Node (iOS), un árbol SAF en
 * memoria (Android) y manejadores de File System Access (web). NO CERTIFICAN HARDWARE:
 * el comportamiento de SAF y del navegador en un teléfono o un ordenador real queda
 * pendiente de prueba en dispositivo.
 *
 * Cargador: `_cargador-local-first.mjs` (transpila los .ts con el `typescript` de functions/).
 *
 *   node functions/test/local-first-sobre-puerto.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importarFuente } from './_cargador-local-first.mjs';
import { crearDisco, crearDobleSAF, crearCarpetaWeb } from './_dobles-local-first.mjs';

const { crearAlmacenSobrePuerto } = await importarFuente('services/almacenLocal/sobrePuerto.ts');
const { crearPuertoDeRuta } = await importarFuente('services/almacenLocal/puertoDeRuta.ts');
const { crearPuertoSAF } = await importarFuente('services/almacenLocal/puertoSAF.ts');
const { crearPuertoDirectorioWeb } = await importarFuente('services/almacenLocal/puertoDirectorioWeb.ts');
const { ErrorAlmacenLocal } = await importarFuente('services/almacenLocal/tipos.ts');

let fallos = 0;
const check = (nombre, cond, extra = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const bytes = (texto) => new TextEncoder().encode(texto);
const texto = (datos) => new TextDecoder().decode(datos);
const codigoDe = async (promesa) => {
  try {
    await promesa;
    return null;
  } catch (error) {
    return error?.codigo ?? `no_tipado: ${error?.message}`;
  }
};
const carpetaTemporal = (nombre) => fs.mkdtempSync(path.join(os.tmpdir(), `wee-b1-${nombre}-`));
const opciones = { plataforma: 'memoria', persistencia: 'no_garantizada' };

/* A. Disco real (iOS): el protocolo de escritura. */
{
  const base = carpetaTemporal('ios');
  const raiz = path.join(base, 'WEE');
  const disco = crearDisco(raiz);
  const almacen = crearAlmacenSobrePuerto(crearPuertoDeRuta(raiz, disco.operaciones), opciones);

  await almacen.escribir('proyectos/p1/recursos/r1', bytes('v1'));
  check('A1) escribir y leer devuelven lo escrito', texto(await almacen.leer('proyectos/p1/recursos/r1')) === 'v1' && (await almacen.existe('proyectos/p1/recursos/r1')));
  const listado = await almacen.listar('proyectos/');
  check('A2) listar muestra la clave con su tamaño y sin temporales', listado.length === 1 && listado[0].clave === 'proyectos/p1/recursos/r1' && listado[0].tamano === 2, JSON.stringify(listado));

  await almacen.escribir('proyectos/p1/recursos/r1', bytes('v2'));
  check('A3) sobrescribir cambia el contenido y no deja restos', texto(await almacen.leer('proyectos/p1/recursos/r1')) === 'v2' && (await almacen.listar('')).length === 1);

  for (let i = 0; i < 3; i++) await almacen.escribir('reintento/x', bytes(`intento-${i}`));
  check('A4) reintentar la misma clave no duplica: un solo archivo en disco', fs.readdirSync(path.join(raiz, 'reintento')).length === 1 && texto(await almacen.leer('reintento/x')) === 'intento-2');

  const antesDeSinEspacio = fs.readdirSync(raiz).sort().join(',');
  const sinEspacio = crearAlmacenSobrePuerto(crearPuertoDeRuta(raiz, crearDisco(raiz, { capacidad: 10 }).operaciones), opciones);
  check('A5) sin espacio se rechaza ANTES de tocar nada', (await codigoDe(sinEspacio.escribir('grande', bytes('0123456789ABCDEFGHIJ')))) === 'sin_espacio' && fs.readdirSync(raiz).sort().join(',') === antesDeSinEspacio && !fs.existsSync(path.join(raiz, 'grande.tmp')));

  // Corte en cada paso del protocolo: el original o el nuevo, nunca nada, y ningún temporal sobra.
  const pasos = [
    { nombre: 'escribir el temporal', operacion: 'escribir', n: 0, esperado: 'v1' },
    { nombre: 'leer el temporal para verificarlo', operacion: 'leer', n: 0, esperado: 'v1' },
    { nombre: 'apartar el original', operacion: 'mover', n: 0, esperado: 'v1' },
    { nombre: 'promover el nuevo', operacion: 'mover', n: 1, esperado: 'v1' },
    { nombre: 'retirar el apartado', operacion: 'borrar', n: 1, esperado: 'v2' },
  ];
  for (const paso of pasos) {
    const dir = carpetaTemporal('corte');
    const r = path.join(dir, 'WEE');
    await crearAlmacenSobrePuerto(crearPuertoDeRuta(r, crearDisco(r).operaciones), opciones).escribir('p/k', bytes('v1'));
    let vistos = 0;
    let disparado = false;
    const disco = crearDisco(r, {
      fallar: (operacion) => {
        if (disparado || operacion !== paso.operacion) return false;
        if (vistos++ !== paso.n) return false;
        disparado = true;
        return true;
      },
    });
    const almacenCortado = crearAlmacenSobrePuerto(crearPuertoDeRuta(r, disco.operaciones), opciones);
    const codigo = await codigoDe(almacenCortado.escribir('p/k', bytes('v2')));
    const recuperador = crearAlmacenSobrePuerto(crearPuertoDeRuta(r, crearDisco(r).operaciones), opciones);
    await recuperador.limpiarTemporales();
    const contenido = texto(await recuperador.leer('p/k'));
    const restos = (await recuperador.listar('')).map((e) => e.clave).length !== 1 || fs.readdirSync(path.join(r, 'p')).length !== 1;
    check(`A6) corte al ${paso.nombre}: el catálogo queda en «${paso.esperado}», sin temporales ni apartados`, disparado && codigo !== null && contenido === paso.esperado && !restos, `contenido=${contenido} codigo=${codigo}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // Lectura de vuelta distinta (corrupción silenciosa): el temporal se rechaza y el original sigue.
  const lecturaCorrupta = {
    ...crearPuertoDeRuta(raiz, disco.operaciones),
    async leer(ruta) {
      const datos = await crearPuertoDeRuta(raiz, disco.operaciones).leer(ruta);
      if (ruta.endsWith('.tmp') && datos.length > 0) datos[0] ^= 1;
      return datos;
    },
  };
  const codigoCorrupto = await codigoDe(crearAlmacenSobrePuerto(lecturaCorrupta, opciones).escribir('proyectos/p1/recursos/r1', bytes('v3')));
  check('A7) una lectura de vuelta distinta se rechaza como corrupto y el original no cambia', codigoCorrupto === 'corrupto' && texto(await almacen.leer('proyectos/p1/recursos/r1')) === 'v2' && !fs.existsSync(path.join(raiz, 'proyectos/p1/recursos/r1.tmp')));

  // Recuperación: un apartado sin su original lo restaura.
  fs.renameSync(path.join(raiz, 'proyectos/p1/recursos/r1'), path.join(raiz, 'proyectos/p1/recursos/r1.anterior'));
  const restaurados = await almacen.limpiarTemporales();
  check('A8) un apartado sin original se restaura al limpiar', restaurados === 1 && texto(await almacen.leer('proyectos/p1/recursos/r1')) === 'v2');

  let claveReservada = null;
  try {
    await almacen.escribir('algo.anterior', bytes('x'));
  } catch (error) {
    claveReservada = error instanceof ErrorAlmacenLocal ? error.codigo : 'no_tipado';
  }
  check('A9) una clave con el sufijo reservado se rechaza (desconocido)', claveReservada === 'desconocido', String(claveReservada));
  fs.rmSync(base, { recursive: true, force: true });
}

/* B. Storage Access Framework (Android): sin duplicados y sin espacio conocido. */
{
  const saf = crearDobleSAF();
  const almacen = crearAlmacenSobrePuerto(crearPuertoSAF(saf.raizUri, saf.operaciones), opciones);
  await almacen.escribir('proyectos/p1/recursos/r1', bytes('a1'));
  await almacen.escribir('proyectos/p1/recursos/r1', bytes('a2'));
  await almacen.escribir('proyectos/p1/recursos/r1', bytes('a3'));
  check('B1) SAF: escribir y reintentar la misma clave no crea «(1)»', saf.controles.duplicados() === 0 && texto(await almacen.leer('proyectos/p1/recursos/r1')) === 'a3');
  check('B2) SAF: las carpetas intermedias se crean una sola vez', saf.controles.nombresDelPadre(saf.raizUri).join(',') === 'proyectos');
  const espacioDesconocido = await almacen.estado();
  check('B3) SAF: el espacio libre es desconocido (null), y por eso no bloquea la escritura', espacioDesconocido.espacioLibre === null && (await codigoDe(almacen.escribir('grande', new Uint8Array(4096)))) === null);
  saf.controles.revocarPermiso();
  const codigoRevocado = await codigoDe(almacen.leer('proyectos/p1/recursos/r1'));
  check('B4) SAF: un permiso revocado se ve como fallo, nunca como vacío', codigoRevocado !== null && codigoRevocado.startsWith('no_tipado'), String(codigoRevocado));
  saf.controles.restaurarPermiso();
}

/* C. File System Access (web): escritura atómica al cerrar y errores con nombre. */
{
  const carpeta = crearCarpetaWeb('WEE', { capacidad: 100 });
  const puerto = crearPuertoDirectorioWeb(async () => carpeta.raiz, async () => 100 - carpeta.controles.bytesEnDisco());
  const almacen = crearAlmacenSobrePuerto(puerto, opciones);
  await almacen.escribir('proyectos/p1/recursos/r1', bytes('w1'));
  await almacen.escribir('proyectos/p1/recursos/r1', bytes('w2'));
  check('C1) web: escribir y sobrescribir devuelven el último contenido, sin duplicados', texto(await almacen.leer('proyectos/p1/recursos/r1')) === 'w2' && (await almacen.listar('proyectos')).length === 1);
  check('C2) web: sin espacio se rechaza antes de escribir (espacio medido por la API)', (await codigoDe(almacen.escribir('grande', new Uint8Array(200)))) === 'sin_espacio');

  carpeta.controles.fallarAlCerrar();
  const codigoAlCerrar = await codigoDe(almacen.escribir('proyectos/p1/recursos/r1', bytes('w3')));
  carpeta.controles.permitirCierre();
  check('C3) web: un fallo al cerrar el flujo deja el contenido anterior (la escritura es atómica al cerrar)', codigoAlCerrar !== null && texto(await almacen.leer('proyectos/p1/recursos/r1')) === 'w2');

  check('C4) web: leer lo que no existe es no_encontrado', (await codigoDe(almacen.leer('no/existe'))) === 'no_encontrado');
  const cuotaDelNavegador = crearCarpetaWeb('WEE', { capacidad: 10 });
  const puertoCuota = crearPuertoDirectorioWeb(async () => cuotaDelNavegador.raiz, async () => null);
  check('C5) web: QuotaExceededError del navegador se traduce a sin_espacio', (await codigoDe(puertoCuota.escribir('x', new Uint8Array(50)))) === 'sin_espacio');
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
