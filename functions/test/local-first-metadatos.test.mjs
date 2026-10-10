/**
 * LÍNEA I («Mis proyectos») · metadatos fuera de la carpeta WEE y reparto por clave.
 *
 * Cubre: el almacén de metadatos sobre AsyncStorage (con un doble de clave-valor), el
 * enrutador que reparte cada clave entre la carpeta y los metadatos, la integración con el
 * catálogo real (la carpeta solo recibe archivos del usuario) y la REGRESIÓN de borrado de
 * huérfanos: sin índice nunca se borra nada de la carpeta.
 *
 * Cargador: `_cargador-local-first.mjs`. Dobles: memoria (`almacen-memoria.ts`) y clave-valor.
 *
 *   node functions/test/local-first-metadatos.test.mjs
 */
import { importarFuente } from './_cargador-local-first.mjs';

const { crearAlmacenDeMetadatos } = await importarFuente('services/almacenLocal/almacenDeMetadatos.ts');
const { crearAlmacenEnrutado, esArchivoDelUsuario } = await importarFuente('services/almacenLocal/almacenEnrutado.ts');
const { abrirCatalogoLocal, CLAVE_DEL_INDICE } = await importarFuente('utils/catalogoLocal.ts');
const { crearAlmacenMemoria } = await importarFuente('functions/test/almacen-memoria.ts');
const { ErrorAlmacenLocal } = await importarFuente('services/almacenLocal/tipos.ts');

let fallos = 0;
const check = (nombre, cond, extra = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const bytesDe = (texto) => new TextEncoder().encode(texto);
const textoDe = (datos) => new TextDecoder().decode(datos);
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

/** Doble de AsyncStorage: clave-valor en memoria con la misma forma de API. */
const crearKv = () => {
  const mapa = new Map();
  return {
    mapa,
    async getItem(clave) {
      return mapa.has(clave) ? mapa.get(clave) : null;
    },
    async setItem(clave, valor) {
      mapa.set(clave, String(valor));
    },
    async removeItem(clave) {
      mapa.delete(clave);
    },
    async getAllKeys() {
      return [...mapa.keys()];
    },
  };
};

const esClaveDeArchivo = (clave) => /^proyectos\/[^/]+\/recursos\/[^/]+$/.test(clave);

/* M. El almacén de metadatos cumple el contrato sobre clave-valor. */
{
  const kv = crearKv();
  const meta = crearAlmacenDeMetadatos(kv, { plataforma: 'nativo' });
  await meta.escribir('indice.json', bytesDe('{"esquema":1}'));
  check('M1) escribir y leer devuelven los mismos bytes', textoDe(await meta.leer('indice.json')) === '{"esquema":1}');
  check('M2) los datos viven en AsyncStorage bajo el espacio propio, no con la clave desnuda',
    kv.mapa.has('wee.almacen.catalogo.v1/indice.json') && !kv.mapa.has('indice.json'));
  check('M3) leer una clave que no existe es no_encontrado', (await codigoDe(meta.leer('no-existe.json'))) === 'no_encontrado');
  check('M4) existe responde sin leer el contenido', (await meta.existe('indice.json')) === true && (await meta.existe('otra.json')) === false);
  await meta.borrar('indice.json');
  await meta.borrar('indice.json');
  check('M5) borrar es idempotente (dos borrados seguidos no fallan)', (await meta.existe('indice.json')) === false);
  check('M6) una clave temporal (.tmp) está reservada y no se puede guardar', (await codigoDe(meta.escribir('indice.json.tmp', bytesDe('x')))) === 'desconocido');

  await meta.escribir('proyectos/p1/proyecto.json', bytesDe('uno'));
  await meta.escribir('proyectos/p1/caratula', bytesDe('dos!'));
  await meta.escribir('proyectos/p2/proyecto.json', bytesDe('tres'));
  kv.mapa.set('otra-app/clave', 'ajena');
  const delProyecto = await meta.listar('proyectos/p1/');
  check('M7) listar filtra por prefijo, ordena y devuelve los tamaños reales', delProyecto.length === 2 && delProyecto[0].tamano === 4 && delProyecto[1].tamano === 3, JSON.stringify(delProyecto));
  const todas = await meta.listar('');
  check('M8) listar ordena por clave y no ve claves ajenas al espacio de Weë',
    todas.map((e) => e.clave).join('|') === 'proyectos/p1/caratula|proyectos/p1/proyecto.json|proyectos/p2/proyecto.json', todas.map((e) => e.clave).join('|'));
  const estado = await meta.estado();
  check('M9) estado: uso = bytes de Weë, espacio libre desconocido (null) y persistencia no garantizada',
    estado.uso === 4 + 3 + 4 && estado.espacioLibre === null && estado.persistencia === 'no_garantizada' && estado.plataforma === 'nativo',
    JSON.stringify(estado));
  check('M10) limpiarTemporales no borra nada: AsyncStorage no deja escrituras a medias', (await meta.limpiarTemporales()) === 0 && (await meta.existe('proyectos/p1/proyecto.json')));
}

/* R. El enrutador reparte cada clave: archivos del usuario → carpeta; lo demás → metadatos. */
{
  const clasificadas = [
    ['proyectos/p1/recursos/r1', true],
    ['proyectos/p1/recursos/r1.v2', true],
    ['indice.json', false],
    ['proyectos/p1/proyecto.json', false],
    ['proyectos/p1/caratula', false],
    ['cuarentena/indice-x.json', false],
    ['proyectos/p1/recursos', false],
    ['proyectos/p1/recursos/r1/extra', false],
  ];
  const bien = clasificadas.every(([clave, esArchivo]) => esArchivoDelUsuario(clave) === esArchivo);
  check('R1) solo `proyectos/<id>/recursos/<recursoId>` es archivo del usuario', bien, clasificadas.map(([c]) => c).join(' · '));

  const carpeta = crearAlmacenMemoria();
  const kv = crearKv();
  const metadatos = crearAlmacenDeMetadatos(kv, { plataforma: 'nativo' });
  const todo = crearAlmacenEnrutado({ archivos: carpeta, metadatos });
  await todo.escribir('indice.json', bytesDe('i'));
  await todo.escribir('proyectos/p1/proyecto.json', bytesDe('p'));
  await todo.escribir('proyectos/p1/caratula', bytesDe('c'));
  await todo.escribir('proyectos/p1/recursos/r1', bytesDe('archivo del usuario'));
  check('R2) la carpeta solo recibe el archivo del usuario', [...carpeta.respaldo.keys()].every(esClaveDeArchivo) && carpeta.respaldo.has('proyectos/p1/recursos/r1'), [...carpeta.respaldo.keys()].join(' '));
  check('R3) índice, copia y carátula van a los metadatos', (await metadatos.existe('indice.json')) && (await metadatos.existe('proyectos/p1/proyecto.json')) && (await metadatos.existe('proyectos/p1/caratula')));
  const listadas = await todo.listar('proyectos/');
  check('R4) listar mezcla carpeta y metadatos, ordenado', listadas.map((e) => e.clave).join('|') === 'proyectos/p1/caratula|proyectos/p1/proyecto.json|proyectos/p1/recursos/r1', listadas.map((e) => e.clave).join('|'));
  const estadoTodo = await todo.estado();
  check('R5) estado: espacio y plataforma de la carpeta, uso sumado', estadoTodo.uso === 1 + 1 + 1 + 'archivo del usuario'.length && estadoTodo.plataforma === 'memoria' && estadoTodo.espacioLibre === null, JSON.stringify(estadoTodo));
  check('R6) leer y existir siguen la misma ruta que escribir', textoDe(await todo.leer('proyectos/p1/recursos/r1')) === 'archivo del usuario' && (await todo.existe('indice.json')));
}

/* C. Integración con el catálogo real: la carpeta nunca recibe nada interno. */
{
  const carpeta = crearAlmacenMemoria();
  const kv = crearKv();
  const almacen = () => crearAlmacenEnrutado({ archivos: carpeta, metadatos: crearAlmacenDeMetadatos(kv, { plataforma: 'nativo' }) });
  const abrir = (prefijo) => abrirCatalogoLocal(almacen(), { ahora: reloj(), nuevoId: generadorDeIds(prefijo) });

  const c1 = await abrir('a');
  const p = await c1.crearProyecto({ name: 'Mi restaurante', emoji: '🍔' });
  const r = await c1.añadirRecurso(p.projectId, { nombre: 'logo.txt', tipo: 'texto', mimeType: 'text/plain', datos: bytesDe('logo v1') });
  await c1.renombrar(p.projectId, 'Mi restaurante 2');
  await c1.duplicar(p.projectId, 'Copia');
  await c1.regenerarCaratula(p.projectId, bytesDe('miniatura'));
  const c2 = await abrir('b');
  check('C1) el catálogo reabre con sus proyectos y el archivo se lee tras reabrir',
    c2.proyectos().length === 2 && textoDe(await c2.leerRecurso(p.projectId, r.recursoId)) === 'logo v1');
  const contenidoDeCarpeta = [...carpeta.respaldo.keys()];
  check('C2) tras crear, renombrar, duplicar y poner carátula, la carpeta solo tiene archivos del usuario',
    contenidoDeCarpeta.length > 0 && contenidoDeCarpeta.every(esClaveDeArchivo), contenidoDeCarpeta.join(' '));
  check('C3) el índice y las copias existen en los metadatos, no en la carpeta',
    kv.mapa.has(`wee.almacen.catalogo.v1/${CLAVE_DEL_INDICE}`) && [...kv.mapa.keys()].some((k) => k.endsWith('/proyecto.json')));
  check('C4) ninguna clave interna aparece en la carpeta (ni índice, ni copia, ni carátula)',
    !contenidoDeCarpeta.some((k) => k.includes('indice.json') || k.endsWith('proyecto.json') || k.endsWith('caratula')));

  /* REGRESIÓN. Antes, sin índice y sin copias, el catálogo borraba todo lo de la carpeta que no conocía. */
  const carpetaHuerfana = crearAlmacenMemoria();
  await carpetaHuerfana.escribir('proyectos/fantasma/recursos/r1', bytesDe('de una instalación anterior'));
  const kvVacio = crearKv();
  const sinIndice = await abrirCatalogoLocal(crearAlmacenEnrutado({ archivos: carpetaHuerfana, metadatos: crearAlmacenDeMetadatos(kvVacio, { plataforma: 'nativo' }) }), {
    ahora: reloj(),
    nuevoId: generadorDeIds('h'),
  });
  check('C5) REGRESIÓN: sin índice ni copias, abrir el catálogo NO borra los archivos de la carpeta', carpetaHuerfana.respaldo.has('proyectos/fantasma/recursos/r1') && sinIndice.proyectos().length === 0);

  /* CONTROL. Con un índice válido, un archivo que no pertenece a ningún proyecto sí se retira (comportamiento de B1). */
  await abrir('c');
  carpeta.respaldo.set('proyectos/huerfano/recursos/r9', new Uint8Array([1, 2, 3]));
  await abrir('d');
  check('C6) CONTROL: con índice válido, los huérfanos siguen retirándose como en B1', !carpeta.respaldo.has('proyectos/huerfano/recursos/r9'));

  /* Índice corrupto: va a cuarentena y no se borra nada. */
  kv.mapa.set(`wee.almacen.catalogo.v1/${CLAVE_DEL_INDICE}`, btoa('{ no es json'));
  const corrupto = await abrir('e');
  check('C7) índice corrupto: aviso de cuarentena y copia conservada en los metadatos', corrupto.avisos.includes('indice_en_cuarentena') && [...kv.mapa.keys()].some((k) => k.includes('/cuarentena/')));
  check('C8) índice corrupto: los archivos del usuario no se tocan', carpeta.respaldo.has(`proyectos/${p.projectId}/recursos/${r.recursoId}`));
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
