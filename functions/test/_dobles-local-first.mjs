/*
 * DOBLES de las APIs de plataforma para las pruebas de la línea B1 (ubicación WEE).
 *
 * NO CERTIFICAN HARDWARE. Modelan las reglas documentadas de cada API, y las pruebas
 * que los usan lo dicen así en su cabecera:
 *   · disco: el sistema de archivos real de Node, en una carpeta temporal (iOS).
 *   · SAF: un árbol en memoria. Crear un nombre que ya existe da «nombre (1)», como en Android.
 *   · File System Access: manejadores en memoria con permisos, cuotas y errores con nombre
 *     (NotFoundError, TypeMismatchError, QuotaExceededError). La escritura se confirma al cerrar.
 *   · IndexedDB: una fábrica en memoria con peticiones y transacciones asíncronas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { importarFuente } from './_cargador-local-first.mjs';

const { ErrorAlmacenLocal } = await importarFuente('services/almacenLocal/tipos.ts');

/* ── Disco real (iOS y prueba del almacén) ─────────────────────────────────── */

const bytesOcupados = (carpeta) => {
  if (!fs.existsSync(carpeta)) return 0;
  let total = 0;
  for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, entrada.name);
    total += entrada.isDirectory() ? bytesOcupados(ruta) : fs.statSync(ruta).size;
  }
  return total;
};

/**
 * `capacidad`: bytes que caben en `raizDisco` (sin límite si es null).
 * `fallar(operacion, ruta)`: si devuelve true, la operación lanza como un corte.
 */
export const crearDisco = (raizDisco, { capacidad = null, fallar = null } = {}) => {
  const comprobar = (operacion, ruta) => {
    if (fallar && fallar(operacion, ruta)) throw new Error(`corte simulado en ${operacion} de ${path.basename(ruta)}`);
  };
  return {
    raizDisco,
    operaciones: {
      async tipoDe(ruta) {
        if (!fs.existsSync(ruta)) return null;
        return fs.statSync(ruta).isDirectory() ? 'carpeta' : 'archivo';
      },
      async leer(ruta) {
        comprobar('leer', ruta);
        if (!fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) throw new ErrorAlmacenLocal('no_encontrado', ruta);
        return new Uint8Array(fs.readFileSync(ruta));
      },
      async escribir(ruta, datos) {
        comprobar('escribir', ruta);
        const previo = fs.existsSync(ruta) ? fs.statSync(ruta).size : 0;
        if (capacidad !== null && bytesOcupados(raizDisco) - previo + datos.byteLength > capacidad) throw new ErrorAlmacenLocal('sin_espacio', ruta);
        fs.mkdirSync(path.dirname(ruta), { recursive: true });
        fs.writeFileSync(ruta, datos);
      },
      async borrar(ruta) {
        comprobar('borrar', ruta);
        if (fs.existsSync(ruta)) fs.rmSync(ruta, { recursive: true, force: true });
      },
      async mover(desde, hasta) {
        comprobar('mover', desde);
        if (!fs.existsSync(desde)) throw new ErrorAlmacenLocal('no_encontrado', desde);
        // El contrato dice que mover solo va hacia un nombre libre: el doble lo exige.
        if (fs.existsSync(hasta)) throw new ErrorAlmacenLocal('desconocido', `destino ocupado: ${path.basename(hasta)}`);
        fs.mkdirSync(path.dirname(hasta), { recursive: true });
        fs.renameSync(desde, hasta);
      },
      async crearCarpeta(ruta) {
        comprobar('crearCarpeta', ruta);
        fs.mkdirSync(ruta, { recursive: true });
      },
      async listar(ruta) {
        if (!fs.existsSync(ruta) || !fs.statSync(ruta).isDirectory()) return [];
        return fs.readdirSync(ruta, { withFileTypes: true }).map((entrada) => ({
          nombre: entrada.name,
          tipo: entrada.isDirectory() ? 'carpeta' : 'archivo',
          tamano: entrada.isDirectory() ? 0 : fs.statSync(path.join(ruta, entrada.name)).size,
        }));
      },
      async espacioLibre() {
        return capacidad === null ? null : Math.max(0, capacidad - bytesOcupados(raizDisco));
      },
    },
  };
};

/* ── Storage Access Framework (Android) ────────────────────────────────────── */

/**
 * Un árbol SAF en memoria. Reglas modeladas: crear con un nombre ya existente da
 * «nombre (1)» (y se cuenta en `duplicados`); los hijos se piden por carpeta; el
 * espacio libre NO se conoce (null); el permiso puede revocarse.
 */
export const crearDobleSAF = () => {
  let secuencia = 0;
  let duplicados = 0;
  let revocado = false;
  let selectorConcede = true;
  let fallo = null;
  const nodos = new Map();
  const raiz = { uri: 'content://saf/tree/Documentos', nombre: 'Documentos', esCarpeta: true, padre: null, hijos: [], contenido: null };
  nodos.set(raiz.uri, raiz);

  const comprobar = (operacion) => {
    if (revocado) throw new Error('permiso de SAF revocado');
    if (fallo && fallo(operacion)) throw new Error(`corte simulado en ${operacion}`);
  };
  const nombreLibre = (padre, nombre) => {
    const ocupados = new Set(padre.hijos.map((hijo) => hijo.nombre));
    if (!ocupados.has(nombre)) return nombre;
    duplicados++;
    let n = 1;
    while (ocupados.has(`${nombre} (${n})`)) n++;
    return `${nombre} (${n})`;
  };
  const crear = (uriPadre, nombre, esCarpeta) => {
    comprobar(esCarpeta ? 'crearCarpeta' : 'crearArchivo');
    const padre = nodos.get(uriPadre);
    if (!padre || !padre.esCarpeta) throw new Error('la carpeta padre no existe');
    const real = nombreLibre(padre, nombre);
    const nodo = { uri: `${padre.uri}/document/${++secuencia}-${encodeURIComponent(real)}`, nombre: real, esCarpeta, padre, hijos: [], contenido: esCarpeta ? null : new Uint8Array(0) };
    padre.hijos.push(nodo);
    nodos.set(nodo.uri, nodo);
    return nodo.uri;
  };

  return {
    raizUri: raiz.uri,
    operaciones: {
      async hijos(uri) {
        comprobar('hijos');
        const nodo = nodos.get(uri);
        if (!nodo || !nodo.esCarpeta) throw new Error('no es una carpeta de SAF');
        return nodo.hijos.map((hijo) => ({ uri: hijo.uri, nombre: hijo.nombre, esCarpeta: hijo.esCarpeta, tamano: hijo.esCarpeta ? null : hijo.contenido.byteLength }));
      },
      async crearCarpeta(uriPadre, nombre) {
        return crear(uriPadre, nombre, true);
      },
      async crearArchivo(uriPadre, nombre) {
        return crear(uriPadre, nombre, false);
      },
      async leer(uri) {
        comprobar('leer');
        const nodo = nodos.get(uri);
        if (!nodo || nodo.esCarpeta) throw new Error('no existe el archivo de SAF');
        return new Uint8Array(nodo.contenido);
      },
      async escribir(uri, datos) {
        comprobar('escribir');
        const nodo = nodos.get(uri);
        if (!nodo || nodo.esCarpeta) throw new Error('no existe el archivo de SAF');
        nodo.contenido = new Uint8Array(datos);
      },
      async borrar(uri) {
        comprobar('borrar');
        const nodo = nodos.get(uri);
        if (!nodo) return;
        nodo.padre.hijos = nodo.padre.hijos.filter((hijo) => hijo !== nodo);
        nodos.delete(uri);
      },
    },
    /** El selector que la persona usa para elegir la carpeta. */
    async elegirCarpeta() {
      return selectorConcede ? raiz.uri : null;
    },
    async puedeLeer(uri) {
      return !revocado && nodos.has(uri);
    },
    controles: {
      revocarPermiso: () => (revocado = true),
      restaurarPermiso: () => (revocado = false),
      denegarSelector: () => (selectorConcede = false),
      concederSelector: () => (selectorConcede = true),
      fallarEn: (funcion) => (fallo = funcion),
      duplicados: () => duplicados,
      nombresDelPadre(uri) {
        return nodos.get(uri).hijos.map((hijo) => hijo.nombre).sort();
      },
    },
  };
};

/* ── File System Access (Chromium) ─────────────────────────────────────────── */

const errorConNombre = (nombre, mensaje) => Object.assign(new Error(mensaje ?? nombre), { name: nombre });

/**
 * Un manejador de carpeta. `permiso`: 'granted' | 'prompt' | 'denied'. `respuesta`: lo que
 * contesta requestPermission. `capacidad`: bytes que caben (QuotaExceededError al sobrepasarlos).
 * La escritura se confirma al cerrar el flujo: si `close` falla, el archivo queda como estaba.
 */
export const crearCarpetaWeb = (nombre, { permiso = 'granted', respuesta = 'granted', capacidad = null } = {}) => {
  const estado = { permiso, respuesta, capacidad, cierreFallido: false, gestosDePermiso: 0 };
  const bytesEnDisco = (raiz) => {
    let total = 0;
    const recorrer = (directorio) => {
      for (const [, manejador] of directorio.entradas) {
        if (manejador.kind === 'file') total += manejador.contenido.byteLength;
        else recorrer(manejador);
      }
    };
    recorrer(raiz);
    return total;
  };
  const crearDirectorio = (nombreDelDirectorio) => {
    const directorio = {
      kind: 'directory',
      name: nombreDelDirectorio,
      entradas: new Map(),
      async getDirectoryHandle(clave, opciones = {}) {
        if (directorio.entradas.has(clave)) {
          const existente = directorio.entradas.get(clave);
          if (existente.kind !== 'directory') throw errorConNombre('TypeMismatchError');
          return existente;
        }
        if (!opciones.create) throw errorConNombre('NotFoundError');
        const nuevo = crearDirectorio(clave);
        directorio.entradas.set(clave, nuevo);
        return nuevo;
      },
      async getFileHandle(clave, opciones = {}) {
        if (directorio.entradas.has(clave)) {
          const existente = directorio.entradas.get(clave);
          if (existente.kind !== 'file') throw errorConNombre('TypeMismatchError');
          return existente;
        }
        if (!opciones.create) throw errorConNombre('NotFoundError');
        const archivo = crearArchivo(clave);
        directorio.entradas.set(clave, archivo);
        return archivo;
      },
      async removeEntry(clave) {
        if (!directorio.entradas.has(clave)) throw errorConNombre('NotFoundError');
        directorio.entradas.delete(clave);
      },
      async *entries() {
        for (const par of directorio.entradas) yield par;
      },
      async queryPermission() {
        return estado.permiso;
      },
      async requestPermission() {
        estado.gestosDePermiso++;
        estado.permiso = estado.respuesta;
        return estado.permiso;
      },
    };
    return directorio;
  };
  const crearArchivo = (nombreDelArchivo) => {
    const archivo = {
      kind: 'file',
      name: nombreDelArchivo,
      contenido: new Uint8Array(0),
      async getFile() {
        const actual = archivo.contenido;
        return { size: actual.byteLength, arrayBuffer: async () => actual.slice().buffer };
      },
      async createWritable() {
        let pendiente = null;
        return {
          async write(datos) {
            const otros = bytesEnDisco(raizDeLaPrueba) - archivo.contenido.byteLength;
            if (estado.capacidad !== null && otros + datos.byteLength > estado.capacidad) throw errorConNombre('QuotaExceededError');
            pendiente = new Uint8Array(datos);
          },
          async close() {
            if (estado.cierreFallido) throw errorConNombre('AbortError', 'cierre fallido');
            if (pendiente) archivo.contenido = pendiente;
          },
        };
      },
    };
    return archivo;
  };
  const raizDeLaPrueba = crearDirectorio(nombre);
  return {
    raiz: raizDeLaPrueba,
    estado,
    controles: {
      fallarAlCerrar: () => (estado.cierreFallido = true),
      permitirCierre: () => (estado.cierreFallido = false),
      bytesEnDisco: () => bytesEnDisco(raizDeLaPrueba),
    },
  };
};

/* ── IndexedDB ─────────────────────────────────────────────────────────────── */

/** Una fábrica de IndexedDB en memoria: peticiones y transacciones asíncronas, como el navegador. */
export const crearFabricaIdb = ({ fallarAbrir = false } = {}) => {
  const bases = new Map();
  const planificar = (funcion) => setTimeout(funcion, 0);

  const crearBase = (base) => ({
    objectStoreNames: { contains: (nombre) => base.tiendas.has(nombre) },
    createObjectStore(nombre) {
      base.tiendas.set(nombre, new Map());
      return {};
    },
    transaction(nombre) {
      const tienda = base.tiendas.get(nombre);
      const tx = { error: null, oncomplete: null, onerror: null, onabort: null };
      const operar = (ejecutar) => {
        const peticion = { result: undefined, error: null, onsuccess: null, onerror: null };
        const resultado = ejecutar(tienda);
        planificar(() => {
          peticion.result = resultado;
          if (peticion.onsuccess) peticion.onsuccess();
        });
        return peticion;
      };
      tx.objectStore = () => ({
        put: (valor, clave) => operar((t) => (t.set(clave, valor), clave)),
        get: (clave) => operar((t) => t.get(clave)),
        delete: (clave) => operar((t) => (t.delete(clave), undefined)),
      });
      // Dos niveles: las operaciones de esta transacción responden primero y la confirmación va después, como en el navegador.
      planificar(() => planificar(() => {
        if (tx.oncomplete) tx.oncomplete();
      }));
      return tx;
    },
  });

  return {
    bases,
    open(nombre, version) {
      const peticion = { result: null, error: null, onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null };
      planificar(() => {
        if (fallarAbrir) {
          peticion.error = new Error('IndexedDB no disponible');
          if (peticion.onerror) peticion.onerror();
          return;
        }
        let base = bases.get(nombre);
        if (!base) {
          base = { version: 0, tiendas: new Map() };
          bases.set(nombre, base);
        }
        peticion.result = crearBase(base);
        if (base.version < version) {
          base.version = version;
          if (peticion.onupgradeneeded) peticion.onupgradeneeded();
        }
        if (peticion.onsuccess) peticion.onsuccess();
      });
      return peticion;
    },
  };
};
