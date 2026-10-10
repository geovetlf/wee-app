/**
 * LÍNEA I («Mis proyectos») · la sección «En este dispositivo», con dobles.
 *
 * Prueba el controlador de la pantalla (utils/seccionDelDispositivo.ts): estados de la ubicación,
 * acciones sobre los proyectos y la REGLA de que un proyecto solo sale «disponible» si su archivo
 * existe y se puede abrir. Sin React, sin Expo y sin tocar archivos reales: la carpeta WEE es un
 * directorio temporal del sistema (el mismo doble de disco que la línea B1) y los metadatos son un
 * doble de clave-valor en memoria.
 *
 * Cargador: `_cargador-local-first.mjs`.
 *
 *   node functions/test/local-first-seccion.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importarFuente } from './_cargador-local-first.mjs';
import { crearDisco } from './_dobles-local-first.mjs';

const { crearAlmacenDeMetadatos } = await importarFuente('services/almacenLocal/almacenDeMetadatos.ts');
const { crearAlmacenSobrePuerto } = await importarFuente('services/almacenLocal/sobrePuerto.ts');
const { crearPuertoDeRuta } = await importarFuente('services/almacenLocal/puertoDeRuta.ts');
const { ErrorAlmacenLocal } = await importarFuente('services/almacenLocal/tipos.ts');
const { decodificarBundle } = await importarFuente('utils/bundleLocal.ts');
const {
  cargarSeccion,
  activarSeccion,
  volverAPermitirSeccion,
  crearProyectoEnSeccion,
  abrirProyectoEnSeccion,
  duplicarProyectoEnSeccion,
  eliminarProyectoEnSeccion,
  exportarProyectoEnSeccion,
  entregarProyectoEnSeccion,
  nombreDeArchivoDeExportacion,
  crearTurno,
} = await importarFuente('utils/seccionDelDispositivo.ts');

let fallos = 0;
const check = (nombre, cond, extra = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const bytesDe = (texto) => new TextEncoder().encode(texto);
const textoDe = (datos) => new TextDecoder().decode(datos);
const reloj = () => {
  let t = 1_700_000_000_000;
  return () => (t += 1000);
};
const generadorDeIds = (prefijo) => {
  let n = 0;
  return () => `${prefijo}${String(++n).padStart(4, '0')}`;
};
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
const crearTiendaMemoria = () => {
  let registro = null;
  return {
    get registro() {
      return registro;
    },
    async leer() {
      return registro;
    },
    async guardar(nuevo) {
      registro = nuevo;
    },
    async borrar() {
      registro = null;
    },
  };
};

const RAIZ_DE_PRUEBAS = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-seccion-'));
let carpetasCreadas = 0;
const carpetaPadre = () => {
  const ruta = path.join(RAIZ_DE_PRUEBAS, `padre-${++carpetasCreadas}`);
  fs.mkdirSync(ruta);
  return ruta;
};

/*
 * Un puerto de ubicación de prueba. Los `flags` se cambian DURANTE la prueba para simular lo que
 * pasa después de activar: que la carpeta se pierda, que el permiso se revoque, que un archivo
 * no se pueda leer o que la carpeta deje de dar acceso.
 */
const crearUbicacionDePrueba = ({ plataforma, padre, eleccion, flags }) => ({
  plataforma,
  async elegirCarpeta() {
    return eleccion === 'denegada' || flags.denegarEleccion ? null : padre;
  },
  async crearWee(referenciaPadre) {
    const wee = path.join(referenciaPadre, 'WEE');
    fs.mkdirSync(wee, { recursive: true });
    return wee;
  },
  async comprobarReferencia() {
    return flags.comprobacion;
  },
  async pedirDeNuevo() {
    return flags.pedirDeNuevo;
  },
  puertoDeArchivos(referenciaWee) {
    const operaciones = crearDisco(referenciaWee, { fallar: (operacion, ruta) => operacion === 'leer' && flags.noLegibles.has(path.basename(ruta)) }).operaciones;
    return crearPuertoDeRuta(referenciaWee, {
      ...operaciones,
      async leer(ruta) {
        if (flags.sinAcceso) throw new ErrorAlmacenLocal('no_disponible', ruta);
        return operaciones.leer(ruta);
      },
    });
  },
});

/** Un entorno completo: ubicación, registro, metadatos y la carpeta WEE en un directorio temporal. */
const entorno = ({ plataforma = 'android', eleccion = 'concedida', capacidad = null } = {}) => {
  const padre = carpetaPadre();
  const flags = { comprobacion: 'concedida', pedirDeNuevo: true, sinAcceso: false, denegarEleccion: false, noLegibles: new Set() };
  const kv = crearKv();
  const tienda = crearTiendaMemoria();
  const puerto = crearUbicacionDePrueba({ plataforma, padre, eleccion, flags });
  const deps = {
    puerto,
    tienda,
    metadatos: crearAlmacenDeMetadatos(kv, { plataforma: 'memoria' }),
    archivosDe: (referenciaWee) =>
      crearAlmacenSobrePuerto(
        capacidad === null ? puerto.puertoDeArchivos(referenciaWee) : crearPuertoDeRuta(referenciaWee, crearDisco(referenciaWee, { capacidad }).operaciones),
        { plataforma: 'memoria', persistencia: 'desconocida' },
      ),
    ahora: reloj(),
    nuevoId: generadorDeIds('s'),
  };
  const wee = path.join(padre, 'WEE');
  return { deps, kv, tienda, flags, padre, wee, rutaDelArchivo: (projectId, recursoId) => path.join(wee, 'proyectos', projectId, 'recursos', recursoId) };
};

/** Todos los ficheros de un directorio, como rutas relativas con «/». */
const ficherosBajo = (dir, base = dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(dir, entrada.name);
    return entrada.isDirectory() ? ficherosBajo(ruta, base) : [path.relative(base, ruta).split(path.sep).join('/')];
  });
};

const ES_ARCHIVO_DEL_USUARIO = /^proyectos\/[^/]+\/recursos\/[^/]+$/;

/* S. Estados de la ubicación. */

{
  const e = entorno();
  const vista = await cargarSeccion(e.deps);
  check('S1) sin carpeta guardada, la sección dice «sin configurar» y no abre nada', vista.estado.ubicacion === 'sin_configurar' && vista.catalogo === null && vista.estado.proyectos.length === 0);
}

{
  const e = entorno();
  const vista = await activarSeccion(e.deps);
  check('S2) al activar (Android), la carpeta WEE se crea y el catálogo queda disponible', vista.estado.ubicacion === 'disponible' && vista.catalogo !== null && fs.existsSync(e.wee));
  check('S3) el registro de la ubicación se guarda con la referencia de la carpeta WEE', e.tienda.registro?.referenciaWee === e.wee && e.tienda.registro?.plataforma === 'android');
}

{
  const e = entorno({ eleccion: 'denegada' });
  let vista = null;
  let lanzo = false;
  try {
    vista = await activarSeccion(e.deps);
  } catch {
    lanzo = true;
  }
  check('S4) un permiso denegado NO bloquea: la sección lo muestra y la app sigue', !lanzo && vista?.estado.ubicacion === 'permiso_denegado' && vista.catalogo === null);
}

{
  const sinPuerto = { ...entorno().deps, puerto: null, tienda: null };
  const cargada = await cargarSeccion(sinPuerto);
  const activada = await activarSeccion(sinPuerto);
  check('S5) sin ubicación en el aparato (web sin capacidades), la sección dice «no disponible» sin fallar',
    cargada.estado.ubicacion === 'no_disponible' && activada.estado.ubicacion === 'no_disponible' && cargada.estado.plataforma === null);
}

{
  const e = entorno({ plataforma: 'web-privado' });
  const vista = await activarSeccion(e.deps);
  check('S6) el espacio privado del navegador (OPFS) se etiqueta como tal: la plataforma llega a la vista', vista.estado.plataforma === 'web-privado' && vista.estado.ubicacion === 'disponible');
}

{
  const e = entorno();
  await activarSeccion(e.deps);
  e.flags.comprobacion = 'perdida';
  const vista = await cargarSeccion(e.deps);
  check('S7) una carpeta guardada que ya no existe: «no disponible», pero con registro, para ofrecer elegir otra',
    vista.estado.ubicacion === 'no_disponible' && vista.estado.registro !== null && vista.catalogo === null);
}

{
  // Web: el navegador concede el permiso con un gesto de la persona.
  const e = entorno({ plataforma: 'web-carpeta' });
  await activarSeccion(e.deps);
  e.flags.comprobacion = 'requiere_gesto';
  e.flags.pedirDeNuevo = true;
  const perdida = await cargarSeccion(e.deps);
  const recuperada = await volverAPermitirSeccion(e.deps, perdida.estado.registro);
  check('S8) web · permiso perdido: volver a permitir con un gesto devuelve la sección a «disponible»',
    perdida.estado.ubicacion === 'permiso_perdido' && recuperada.estado.ubicacion === 'disponible' && recuperada.catalogo !== null);
}

{
  // Web: la persona niega el permiso. Sigue en «permiso perdido», pero puede volver a intentarlo.
  const e = entorno({ plataforma: 'web-carpeta' });
  await activarSeccion(e.deps);
  e.flags.comprobacion = 'requiere_gesto';
  e.flags.pedirDeNuevo = false;
  const perdida = await cargarSeccion(e.deps);
  const sigue = await volverAPermitirSeccion(e.deps, perdida.estado.registro);
  check('S9) web · si la persona niega el permiso, la sección sigue en «permiso perdido» y no bloquea', sigue.estado.ubicacion === 'permiso_perdido' && sigue.catalogo === null);
}

{
  // Android: el SAF no concede nada en sitio (su puerto devuelve false en pedirDeNuevo). Antes «volver a permitir»
  // devolvía el mismo estado (callejón sin salida).
  const e = entorno({ plataforma: 'android' });
  await activarSeccion(e.deps);
  e.flags.comprobacion = 'requiere_gesto';
  e.flags.pedirDeNuevo = false;
  const perdida = await cargarSeccion(e.deps);
  const recuperada = await volverAPermitirSeccion(e.deps, perdida.estado.registro);
  check('S30) Android · permiso perdido: «volver a permitir» lleva a elegir la carpeta y la sección vuelve a «disponible»',
    perdida.estado.ubicacion === 'permiso_perdido' && recuperada.estado.ubicacion === 'disponible' && recuperada.catalogo !== null, recuperada.estado.ubicacion);
}

{
  const e = entorno({ plataforma: 'android' });
  await activarSeccion(e.deps);
  e.flags.comprobacion = 'requiere_gesto';
  e.flags.pedirDeNuevo = false;
  const perdida = await cargarSeccion(e.deps);
  e.flags.denegarEleccion = true;
  const cerrada = await volverAPermitirSeccion(e.deps, perdida.estado.registro);
  check('S31) Android · si la persona cierra el selector al volver a permitir, la sección dice «permiso denegado» y sigue usable',
    cerrada.estado.ubicacion === 'permiso_denegado' && cerrada.catalogo === null, cerrada.estado.ubicacion);
}

{
  const e = entorno();
  const { catalogo } = await activarSeccion(e.deps);
  const creado = await crearProyectoEnSeccion(catalogo, 'Con archivo');
  await catalogo.añadirRecurso(creado.valor.projectId, { nombre: 'a.txt', tipo: 'texto', mimeType: 'text/plain', datos: bytesDe('a') });
  e.flags.sinAcceso = true;
  const enCarga = await cargarSeccion(e.deps);
  check('S10) la carpeta deja de dar acceso con un proyecto dentro: la sección lo dice y no bloquea',
    (enCarga.estado.ubicacion === 'permiso_perdido' || enCarga.estado.ubicacion === 'no_disponible') && enCarga.catalogo === null, enCarga.estado.ubicacion);
}

/* P. Proyectos: un proyecto solo es «disponible» si su archivo existe y se puede abrir. */

{
  const e = entorno();
  const { catalogo } = await activarSeccion(e.deps);
  const creado = await crearProyectoEnSeccion(catalogo, 'Mi restaurante');
  const vista = await cargarSeccion(e.deps);
  const proyecto = vista.estado.proyectos[0];
  check('S11) un proyecto vacío se lista como «sin archivos», nunca como «disponible»',
    creado.ok && proyecto?.name === 'Mi restaurante' && proyecto.estado === 'sin_archivos' && proyecto.archivos.length === 0);
}

{
  const e = entorno();
  const { catalogo } = await activarSeccion(e.deps);
  const error = await crearProyectoEnSeccion(catalogo, '   ');
  check('S12) un nombre vacío se rechaza con su clave de texto', !error.ok && error.error === 'errorNombreNoValido', JSON.stringify(error));
}

/* Un proyecto con un archivo real, para los casos siguientes. */
const proyectoConArchivo = async (e) => {
  const { catalogo } = await activarSeccion(e.deps);
  const creado = await crearProyectoEnSeccion(catalogo, 'Logo');
  const proyectoId = creado.valor.projectId;
  const recurso = await catalogo.añadirRecurso(proyectoId, { nombre: 'logo.txt', tipo: 'texto', mimeType: 'text/plain', datos: bytesDe('logo v1') });
  return { proyectoId, recursoId: recurso.recursoId };
};

{
  const e = entorno();
  const { proyectoId } = await proyectoConArchivo(e);
  const vista = await cargarSeccion(e.deps);
  const proyecto = vista.estado.proyectos.find((p) => p.projectId === proyectoId);
  check('S13) con su archivo verificado, el proyecto sale «disponible»', proyecto?.estado === 'disponible' && proyecto.archivos[0]?.estado === 'local', JSON.stringify(proyecto?.estado));
}

{
  const e = entorno();
  const { proyectoId, recursoId } = await proyectoConArchivo(e);
  fs.rmSync(e.rutaDelArchivo(proyectoId, recursoId));
  const vista = await cargarSeccion(e.deps);
  const proyecto = vista.estado.proyectos.find((p) => p.projectId === proyectoId);
  check('S14) REGLA: si el archivo falta, el proyecto NO sale «disponible» y dice que el archivo está ausente',
    proyecto?.estado === 'archivo_ausente' && proyecto.estado !== 'disponible' && proyecto.archivos[0]?.estado === 'ausente');
}

{
  const e = entorno();
  const { proyectoId, recursoId } = await proyectoConArchivo(e);
  fs.writeFileSync(e.rutaDelArchivo(proyectoId, recursoId), 'XXXXXX');
  const vista = await cargarSeccion(e.deps);
  const proyecto = vista.estado.proyectos.find((p) => p.projectId === proyectoId);
  check('S15) REGLA: si el archivo está dañado (otro contenido), NO sale «disponible»',
    proyecto?.estado === 'archivo_corrupto' && proyecto.estado !== 'disponible', JSON.stringify(proyecto?.estado));
}

{
  const e = entorno();
  const { proyectoId, recursoId } = await proyectoConArchivo(e);
  e.flags.noLegibles.add(recursoId);
  const vista = await cargarSeccion(e.deps);
  const proyecto = vista.estado.proyectos.find((p) => p.projectId === proyectoId);
  check('S16) REGLA: si el archivo existe pero no se puede leer, NO sale «disponible» y se dice el error',
    proyecto?.estado === 'error_recuperable' && proyecto.estado !== 'disponible', JSON.stringify(proyecto?.estado));
}

{
  const e = entorno();
  const { proyectoId, recursoId } = await proyectoConArchivo(e);
  const { catalogo } = await cargarSeccion(e.deps);
  const abierto = await abrirProyectoEnSeccion(catalogo, proyectoId);
  check('S17) abrir lee el archivo real y lo devuelve como local', abierto.ok && abierto.valor[0]?.estado === 'local', JSON.stringify(abierto));
  fs.rmSync(e.rutaDelArchivo(proyectoId, recursoId));
  const tras = await abrirProyectoEnSeccion(catalogo, proyectoId);
  check('S18) abrir un archivo que falta lo reporta como ausente, sin lanzar', tras.ok && tras.valor[0]?.estado === 'ausente', JSON.stringify(tras));
  check('S19) abrir un proyecto que no existe devuelve «no encontrado»', (await abrirProyectoEnSeccion(catalogo, 'noexiste')).error === 'errorNoEncontrado');
}

{
  const e = entorno();
  const { proyectoId } = await proyectoConArchivo(e);
  const { catalogo } = await cargarSeccion(e.deps);
  const copia = await duplicarProyectoEnSeccion(catalogo, proyectoId, 'Copia de Logo');
  const vista = await cargarSeccion(e.deps);
  const dup = vista.estado.proyectos.find((p) => p.name === 'Copia de Logo');
  check('S20) duplicar crea otro proyecto con sus archivos, y la copia también sale «disponible»',
    copia.ok && vista.estado.proyectos.length === 2 && dup?.estado === 'disponible', JSON.stringify(dup?.estado));
}

{
  const e = entorno();
  const { proyectoId } = await proyectoConArchivo(e);
  const { catalogo } = await cargarSeccion(e.deps);
  const borrado = await eliminarProyectoEnSeccion(catalogo, proyectoId);
  const vista = await cargarSeccion(e.deps);
  check('S21) eliminar quita el proyecto de la sección y no deja archivos suyos en la carpeta',
    borrado.ok && vista.estado.proyectos.length === 0 && ficherosBajo(path.join(e.wee, 'proyectos', proyectoId)).length === 0);
}

{
  const e = entorno();
  const { proyectoId } = await proyectoConArchivo(e);
  const { catalogo } = await cargarSeccion(e.deps);
  const exportado = await exportarProyectoEnSeccion(catalogo, proyectoId, 1_700_000_000_000);
  if (!exportado.ok) {
    check('S22) exportar produce un paquete wee-proyecto@1 con el archivo dentro', false, JSON.stringify(exportado));
  } else {
    const paquete = decodificarBundle(exportado.valor);
    check('S22) exportar produce un paquete wee-proyecto@1 con el archivo dentro',
      paquete.formato === 'wee-proyecto@1' && paquete.entrada.name === 'Logo' && paquete.entrada.archivos.length === 1 && textoDe(paquete.entrada.archivos[0].datos) === 'logo v1');
  }
  check('S23) el nombre del archivo exportado no lleva barras ni caracteres prohibidos',
    nombreDeArchivoDeExportacion('Mi/restaurante: "final"?') === 'Mi-restaurante- -final--.weeproy' && nombreDeArchivoDeExportacion('   ') === 'proyecto.weeproy',
    nombreDeArchivoDeExportacion('Mi/restaurante: "final"?'));
}

/* E. Entrega de un proyecto exportado: la entrega va inyectada y nunca lanza hacia la pantalla. */

{
  const e = entorno();
  const { proyectoId } = await proyectoConArchivo(e);
  const { catalogo } = await cargarSeccion(e.deps);
  let recibido = null;
  const entregado = await entregarProyectoEnSeccion(
    catalogo,
    proyectoId,
    'Logo.weeproy',
    async (nombre, datos) => {
      recibido = { nombre, paquete: decodificarBundle(datos) };
      return true;
    },
    1_700_000_000_000,
  );
  check('S32) entregar pasa el nombre del archivo y un paquete wee-proyecto@1 verificable',
    entregado.ok && recibido?.nombre === 'Logo.weeproy' && recibido.paquete.formato === 'wee-proyecto@1' && recibido.paquete.entrada.name === 'Logo', JSON.stringify(entregado));
}

{
  const e = entorno();
  const { proyectoId } = await proyectoConArchivo(e);
  const { catalogo } = await cargarSeccion(e.deps);
  const sinCompartir = await entregarProyectoEnSeccion(catalogo, proyectoId, 'Logo.weeproy', async () => false, 1);
  check('S33) si el sistema no puede compartir, la sección lo dice (antes no pasaba nada y no había aviso)', !sinCompartir.ok && sinCompartir.error === 'errorNoDisponible', JSON.stringify(sinCompartir));
}

{
  const e = entorno();
  const { proyectoId } = await proyectoConArchivo(e);
  const { catalogo } = await cargarSeccion(e.deps);
  let lanzo = false;
  let fallida = null;
  try {
    fallida = await entregarProyectoEnSeccion(catalogo, proyectoId, 'Logo.weeproy', async () => {
      throw new Error('sin espacio en la caché');
    }, 1);
  } catch {
    lanzo = true;
  }
  check('S34) si la entrega falla, el resultado lo dice y no se lanza hacia la pantalla', !lanzo && fallida?.ok === false && fallida.error === 'errorDesconocido', JSON.stringify(fallida));
}

{
  const e = entorno();
  const { proyectoId } = await proyectoConArchivo(e);
  const { catalogo } = await cargarSeccion(e.deps);
  fs.rmSync(path.join(e.wee, 'proyectos', proyectoId, 'recursos'), { recursive: true, force: true });
  let llamada = false;
  const faltan = await entregarProyectoEnSeccion(catalogo, proyectoId, 'Logo.weeproy', async () => {
    llamada = true;
    return true;
  }, 1);
  check('S35) un proyecto con un archivo que falta no se entrega, y se dice cuál es el problema',
    !faltan.ok && faltan.error === 'errorArchivoNoDisponible' && !llamada, JSON.stringify(faltan));
}

/* T. Un turno: dos aperturas del catálogo nunca escriben a la vez. */

/** Duplica un proyecto con una carga de la sección en mitad de la copia. Devuelve el estado de la copia. */
const copiaConCargaEnMedio = async (conTurno) => {
  const e = entorno();
  const { proyectoId } = await proyectoConArchivo(e);
  const turno = crearTurno();
  const original = e.deps.archivosDe;
  let disparado = false;
  let recargaEncolada = null;
  e.deps.archivosDe = (referenciaWee) => {
    const almacen = original(referenciaWee);
    return {
      ...almacen,
      async escribir(clave, datos) {
        await almacen.escribir(clave, datos);
        const archivoDeLaCopia = /^proyectos\/[^/]+\/recursos\//.test(clave) && !clave.startsWith(`proyectos/${proyectoId}/`);
        if (!disparado && archivoDeLaCopia) {
          disparado = true;
          if (conTurno) recargaEncolada = turno(() => cargarSeccion(e.deps));
          else await cargarSeccion(e.deps);
        }
      },
    };
  };
  const { catalogo } = await cargarSeccion(e.deps);
  const copia = conTurno ? await turno(() => duplicarProyectoEnSeccion(catalogo, proyectoId, 'Copia')) : await duplicarProyectoEnSeccion(catalogo, proyectoId, 'Copia');
  if (recargaEncolada) await recargaEncolada;
  const vista = await cargarSeccion(e.deps);
  return { copia: copia.ok, estadoDeLaCopia: vista.estado.proyectos.find((p) => p.name === 'Copia')?.estado ?? 'sin copia' };
};

{
  const conTurno = await copiaConCargaEnMedio(true);
  check('S36) con turno: una carga en mitad de una copia no barre lo que la copia escribe: la copia sale «disponible»',
    conTurno.copia && conTurno.estadoDeLaCopia === 'disponible', JSON.stringify(conTurno));
  const sinTurno = await copiaConCargaEnMedio(false);
  check('S37) sin turno, esa misma carga borra el archivo de la copia en vuelo (el riesgo que el turno evita)',
    sinTurno.estadoDeLaCopia !== 'disponible', JSON.stringify(sinTurno));
}

{
  const turno = crearTurno();
  const orden = [];
  const primera = turno(async () => {
    await new Promise((resolver) => setTimeout(resolver, 15));
    orden.push('a');
    throw new Error('falla a propósito');
  }).catch(() => undefined);
  const segunda = turno(async () => {
    orden.push('b');
    return 7;
  });
  const valor = await segunda;
  await primera;
  check('S38) crearTurno: las operaciones van en orden y un fallo no para la cola', orden.join('') === 'ab' && valor === 7, orden.join(''));
}

/* C. Carpeta y reglas de almacenamiento. */

{
  const e = entorno();
  const { catalogo } = await activarSeccion(e.deps);
  const creado = await crearProyectoEnSeccion(catalogo, 'Uno');
  await catalogo.añadirRecurso(creado.valor.projectId, { nombre: 'a.txt', tipo: 'texto', mimeType: 'text/plain', datos: bytesDe('a') });
  await catalogo.renombrar(creado.valor.projectId, 'Uno bis');
  await duplicarProyectoEnSeccion(catalogo, creado.valor.projectId, 'Copia');
  await cargarSeccion(e.deps);
  const enDisco = ficherosBajo(e.wee);
  check('S24) la carpeta WEE solo contiene archivos del usuario, nunca índice, copias ni carátulas',
    enDisco.length > 0 && enDisco.every((ruta) => ES_ARCHIVO_DEL_USUARIO.test(ruta)), enDisco.join(' '));
  check('S25) el índice y las copias viven en los metadatos, fuera de la carpeta',
    e.kv.mapa.has('wee.almacen.catalogo.v1/indice.json') && [...e.kv.mapa.keys()].some((k) => k.endsWith('/proyecto.json')));
}

{
  const e = entorno();
  const huerfano = path.join(e.wee, 'proyectos', 'fantasma', 'recursos', 'r1');
  fs.mkdirSync(path.dirname(huerfano), { recursive: true });
  fs.writeFileSync(huerfano, 'de una instalación anterior');
  await activarSeccion(e.deps);
  check('S26) REGRESIÓN: archivos de una instalación anterior sin índice no se borran al activar',
    fs.existsSync(huerfano) && fs.readFileSync(huerfano, 'utf8') === 'de una instalación anterior');
}

{
  const e = entorno();
  await activarSeccion(e.deps);
  e.kv.mapa.set('wee.almacen.catalogo.v1/indice.json', Buffer.from('{ no es json').toString('base64'));
  const vista = await cargarSeccion(e.deps);
  const tieneCuarentena = [...e.kv.mapa.keys()].some((k) => k.includes('/cuarentena/'));
  check('S27) un índice dañado avisa y se aparta a cuarentena (nada se borra)', vista.estado.avisos.includes('indice_en_cuarentena') && tieneCuarentena && vista.catalogo !== null);
}

{
  const e = entorno();
  await proyectoConArchivo(e);
  e.kv.mapa.set('wee.almacen.catalogo.v1/indice.json', Buffer.from(JSON.stringify({ esquema: 99, proyectos: [] })).toString('base64'));
  const vista = await cargarSeccion(e.deps);
  const creado = await crearProyectoEnSeccion(vista.catalogo, 'No debe crearse');
  check('S28) un esquema más nuevo es solo lectura: se ve, pero no se crea nada',
    vista.estado.soloLectura === true && !creado.ok && creado.error === 'errorSoloLectura', JSON.stringify(creado));
}

{
  const sinCapacidad = entorno();
  const conCapacidad = entorno({ capacidad: 100_000 });
  const a = await activarSeccion(sinCapacidad.deps);
  const b = await activarSeccion(conCapacidad.deps);
  check('S29) el espacio libre se muestra solo si se puede medir: sin dato es null, nunca 0',
    a.estado.espacioLibre === null && typeof b.estado.espacioLibre === 'number' && b.estado.espacioLibre <= 100_000,
    `${a.estado.espacioLibre} · ${b.estado.espacioLibre}`);
}

fs.rmSync(RAIZ_DE_PRUEBAS, { recursive: true, force: true });
console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
