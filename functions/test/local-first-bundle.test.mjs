/**
 * LÍNEA B1 (local-first) · paquete `wee-proyecto@1`: exportar, importar y rechazar.
 *
 * Comprueba: el ida y vuelta conserva nombre y bytes; el manifiesto no lleva la
 * cuenta ni la carátula; importar nunca sobrescribe (dos importaciones dan dos
 * proyectos); y un paquete alterado, truncado o de otra versión se rechaza sin
 * que el almacén cambie.
 *
 * Cargador: `_cargador-local-first.mjs` (transpila los .ts con el `typescript` de functions/).
 *
 *   node functions/test/local-first-bundle.test.mjs
 */
import { importarFuente } from './_cargador-local-first.mjs';

const { abrirCatalogoLocal } = await importarFuente('utils/catalogoLocal.ts');
const { codificarBundle, decodificarBundle, ErrorDelBundle } = await importarFuente('utils/bundleLocal.ts');
const { crearAlmacenMemoria } = await importarFuente('services/almacenLocal/memoria.ts');

let fallos = 0;
const check = (nombre, cond, extra = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
};

const CUENTA = 'cuenta-secreta-123';
const bytesDe = (texto) => new TextEncoder().encode(texto);
const textoDe = (datos) => new TextDecoder().decode(datos);
const reloj = () => {
  let t = 1_700_000_000_000;
  return () => (t += 1000);
};
const generador = (prefijo) => {
  let n = 0;
  return () => `${prefijo}${String(++n).padStart(4, '0')}`;
};
const abrir = (respaldo = new Map(), prefijo = 'x', cuentaId) =>
  abrirCatalogoLocal(crearAlmacenMemoria(respaldo), { ahora: reloj(), nuevoId: generador(prefijo), ...(cuentaId ? { cuentaId } : {}) });
/** Lo que haría la pantalla al exportar: lee el proyecto y lo empaqueta. */
const exportar = async (catalogo, projectId) => {
  const { proyecto, archivos } = await catalogo.leerParaExportar(projectId);
  return codificarBundle(
    { projectId: proyecto.projectId, name: proyecto.name, emoji: proyecto.emoji, createdAt: proyecto.createdAt, updatedAt: proyecto.updatedAt },
    archivos.map(({ recurso, datos }) => ({
      recursoId: recurso.recursoId,
      nombre: recurso.nombre,
      tipo: recurso.tipo,
      mimeType: recurso.mimeType,
      creadoEn: recurso.creadoEn,
      modificadoEn: recurso.modificadoEn,
      derivadoDe: recurso.derivadoDe,
      datos,
    })),
    1_700_000_999_000,
  );
};
/** Lo que haría la pantalla al importar: decodifica (valida todo) y luego crea. */
const importar = async (catalogo, bytes) => catalogo.importarProyecto(decodificarBundle(bytes).entrada);
const codigoDe = async (funcion) => {
  try {
    await funcion();
    return null;
  } catch (error) {
    return error?.codigo ?? `no_tipado: ${error?.message}`;
  }
};
const manifiestoDe = (bytes) => {
  const largo = new DataView(bytes.buffer, bytes.byteOffset).getUint32(8);
  return bytes.subarray(12, 12 + largo);
};
const contiene = (bytes, texto) => {
  const aguja = bytesDe(texto);
  for (let i = 0; i + aguja.length <= bytes.length; i++) {
    let coincide = true;
    for (let k = 0; k < aguja.length && coincide; k++) if (bytes[i + k] !== aguja[k]) coincide = false;
    if (coincide) return true;
  }
  return false;
};

/* Origen: un proyecto con dos archivos, una cuenta y una carátula que no debe viajar. */
const origen = await abrir(new Map(), 'o', CUENTA);
const proyecto = await origen.crearProyecto({ name: 'Canción de verano 🎵', emoji: '🎵' });
const archivoA = await origen.añadirRecurso(proyecto.projectId, { nombre: 'portada-é.png', tipo: 'imagen', mimeType: 'image/png', datos: bytesDe('pixeles') });
await origen.añadirRecurso(proyecto.projectId, { nombre: 'letra.txt', tipo: 'texto', mimeType: 'text/plain', datos: bytesDe('la letra') });
await origen.regenerarCaratula(proyecto.projectId, bytesDe('MINIATURA-SECRETA'));
const paquete = await exportar(origen, proyecto.projectId);

/* 1. Ida y vuelta en un dispositivo vacío. */
const destino = await abrir(new Map(), 'd');
const importado = await importar(destino, paquete);
check('1) el paquete empieza por la magia WEEPROY1', textoDe(paquete.subarray(0, 8)) === 'WEEPROY1');
check('2) importar en un dispositivo vacío conserva el identificador, el nombre (con acentos y emoji) y el número de archivos', importado.projectId === proyecto.projectId && importado.name === 'Canción de verano 🎵' && importado.itemCount === 2, importado.name);
check('3) los bytes de cada archivo llegan idénticos', textoDe(await destino.leerRecurso(importado.projectId, archivoA.recursoId)) === 'pixeles');
check('4) el proyecto importado registra de dónde viene (importadoDe)', importado.importadoDe === proyecto.projectId);

/* 5. Privacidad: el manifiesto no lleva la cuenta, ni la carátula, ni campos de más. */
const manifiesto = JSON.parse(textoDe(manifiestoDe(paquete)));
check('5) el manifiesto no contiene la cuenta de la persona', !contiene(paquete, CUENTA) && !JSON.stringify(manifiesto).includes('ownerAccountId'));
check('6) la carátula no viaja en el paquete', !contiene(paquete, 'MINIATURA-SECRETA'));
check('7) el proyecto del manifiesto trae solo id, nombre, emoji y fechas', JSON.stringify(Object.keys(manifiesto.proyecto).sort()) === JSON.stringify(['creadoEn', 'emoji', 'id', 'modificadoEn', 'nombre']), JSON.stringify(Object.keys(manifiesto.proyecto)));

/* 8. Importar dos veces el mismo paquete: dos proyectos, ninguno sobrescrito. */
const segundo = await importar(destino, paquete);
check('8) la segunda importación recibe un identificador nuevo', segundo.projectId !== importado.projectId);
check('9) ninguno se sobrescribe: dos proyectos, el primero con su nombre y sus archivos', destino.proyectos().length === 2 && destino.proyecto(importado.projectId).name === 'Canción de verano 🎵' && textoDe(await destino.leerRecurso(importado.projectId, archivoA.recursoId)) === 'pixeles');
check('10) la copia nueva también se lee y registra el mismo origen', segundo.importadoDe === proyecto.projectId && textoDe(await destino.leerRecurso(segundo.projectId, segundo.recursos[0].recursoId)) === 'pixeles');

/* 11. Conflicto en el mismo dispositivo: el original no se toca. */
const mismoDispositivo = await importar(origen, paquete);
check('11) importar en el dispositivo de origen crea otro proyecto y no pisa el original', mismoDispositivo.projectId !== proyecto.projectId && origen.proyectos().length === 2 && origen.proyecto(proyecto.projectId).name === 'Canción de verano 🎵');

/* 12. Paquete alterado: un byte cambiado dentro de un archivo falla por hash, y no se escribe nada. */
const antesDelAlterado = new Map();
const destinoAlterado = await abrir(antesDelAlterado, 'a');
const alterado = paquete.slice();
alterado[alterado.length - 1] ^= 0xff;
const codigoAlterado = await codigoDe(() => importar(destinoAlterado, alterado));
check('12) un archivo alterado se rechaza por hash (hash_no_coincide)', codigoAlterado === 'hash_no_coincide', String(codigoAlterado));
check('13) el dispositivo no cambió: ninguna clave escrita', antesDelAlterado.size === 0 && destinoAlterado.proyectos().length === 0);

/* 14–20. Otros defectos del contenedor, todos antes de tocar el almacén. */
const codigoDeBundle = (bytes) => {
  try {
    decodificarBundle(bytes);
    return null;
  } catch (error) {
    return error instanceof ErrorDelBundle ? error.codigo : `no_tipado: ${error?.message}`;
  }
};
check('14) un paquete cortado se rechaza (formato_no_valido)', codigoDeBundle(paquete.slice(0, paquete.length - 3)) === 'formato_no_valido');
const cabeceraMala = paquete.slice();
cabeceraMala[0] = 0x58;
check('15) una magia distinta se rechaza (formato_no_valido)', codigoDeBundle(cabeceraMala) === 'formato_no_valido');
const versionNueva = paquete.slice();
const posicion = manifiestoDe(paquete).indexOf(0x40) + 12; // el «@» de «wee-proyecto@1»
versionNueva[posicion + 1] = 0x32; // «1» → «2»
check('16) una versión posterior del formato se rechaza como formato_desconocido', codigoDeBundle(versionNueva) === 'formato_desconocido', String(codigoDeBundle(versionNueva)));
check('17) bytes sobrantes al final se rechazan (formato_no_valido)', codigoDeBundle(Uint8Array.from([...paquete, 1, 2, 3])) === 'formato_no_valido');
const manifiestoRoto = new Uint8Array([0x57, 0x45, 0x45, 0x50, 0x52, 0x4f, 0x59, 0x31, 0, 0, 0, 3, 0x6e, 0x6f, 0x6a]);
check('18) un manifiesto que no es JSON se rechaza (formato_no_valido)', codigoDeBundle(manifiestoRoto) === 'formato_no_valido');
check('19) un texto cualquiera no es un paquete (formato_no_valido)', codigoDeBundle(bytesDe('hola')) === 'formato_no_valido');

/* 20. Proyecto vacío y relación derivadoDe conservada. */
const vacio = await origen.crearProyecto({ name: 'Vacío' });
const copiaDelVacio = await origen.duplicar(proyecto.projectId, 'Copia con relación');
const paqueteDeCopia = await exportar(origen, copiaDelVacio.projectId);
const deCopia = await importar(await abrir(new Map(), 'c'), paqueteDeCopia);
check('20) un archivo duplicado conserva la relación con su original (derivadoDe)', deCopia.recursos[0].derivadoDe === archivoA.recursoId);
const paqueteVacio = await exportar(origen, vacio.projectId);
const importadoVacio = await importar(await abrir(new Map(), 'v'), paqueteVacio);
check('21) un proyecto sin archivos viaja y se importa vacío', importadoVacio.itemCount === 0 && importadoVacio.name === 'Vacío');

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
