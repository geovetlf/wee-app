/*
 * H5/H2 · UNA FIRESTORE Y UN STORAGE DE MENTIRA CON LAS REGLAS QUE IMPORTAN AQUÍ.
 *
 * Para las suites deterministas del índice de referencias (`activos-*.test.mjs`) y para las mutaciones. No es una
 * suite: no se ejecuta sola.
 *
 * Lo que sí cumple, porque es lo que se prueba:
 *   · TRANSACCIONES OPTIMISTAS: cada lectura apunta la versión del documento (o su ausencia) y cada consulta su
 *     resultado; al confirmar, si algo de lo leído cambió, la transacción se REPITE entera (como Firestore). Si se
 *     agotan los intentos, falla con ABORTED. Las lecturas van antes que las escrituras: leer después de escribir lanza.
 *   · `create` falla con ALREADY_EXISTS (código 6) y `update` con NOT_FOUND (5).
 *   · `FieldValue.delete()` en `set` con `merge` y en `update`.
 *   · Consultas con `where ==`, `orderBy(documentId)`, `startAfter`, `limit` y `select`, y subcolecciones.
 *   · PAUSAS: una lectura puede quedarse esperando a que la prueba la suelte, para intercalar otra operación en un
 *     punto exacto (planificador determinista). Y un contador de documentos leídos (H5).
 *
 * El Storage: generación por escritura, `ifGenerationMatch` en el borrado (412 si no coincide), 404 «No such
 * object», y fallos pasajeros (503) a la carta.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const requireDeFunctions = createRequire(path.resolve(here, '../package.json'));
const { FieldValue, FieldPath } = requireDeFunctions('firebase-admin/firestore');

const copia = (v) => (v === undefined ? undefined : structuredClone(v));
const campo = (obj, ruta) => String(ruta).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const esBorrado = (v) => v instanceof FieldValue && v.isEqual(FieldValue.delete());
const esIdDeDocumento = (f) => f === '__name__' || (f && typeof f === 'object' && typeof f.isEqual === 'function' && f.isEqual(FieldPath.documentId()));
const error = (code, mensaje) => Object.assign(new Error(mensaje), { code });

/** Aplica un `set` con o sin `merge`, o un `update`, sobre lo que había. */
const fusionar = (previo, datos, merge) => {
  const base = merge ? { ...(previo ?? {}) } : {};
  for (const [k, v] of Object.entries(datos ?? {})) {
    if (esBorrado(v)) delete base[k];
    else base[k] = copia(v);
  }
  return base;
};

export const crearFirestoreFalsa = (opciones = {}) => {
  const docs = new Map(); // ruta → { datos, version, escritoEn }
  let reloj = opciones.reloj ?? (() => Date.now());
  const pausas = [];
  const contador = { lecturas: 0, consultas: 0, transacciones: 0, reintentos: 0, escrituras: 0 };
  const lecturasPorRuta = new Map();

  const ahora = () => reloj();
  const version = (ruta) => docs.get(ruta)?.version ?? 0;

  /** Una lectura que coincide con una pausa se queda esperando a que la prueba la suelte. */
  const quizaPausar = async (que) => {
    for (const p of pausas) {
      if (!p.activa || !p.coincide(que)) continue;
      p.vistas++;
      if (p.vistas !== p.enLaVez) continue;
      p.activa = false;
      p.llegada();
      await p.soltada;
    }
  };

  const instantanea = (ruta) => {
    const d = docs.get(ruta);
    const id = ruta.split('/').pop();
    return {
      id,
      ref: refDoc(ruta),
      exists: !!d,
      data: () => (d ? copia(d.datos) : undefined),
      get: (c) => (d ? copia(campo(d.datos, c)) : undefined),
      updateTime: d ? { toMillis: () => d.escritoEn } : undefined,
    };
  };

  const escribir = (ruta, datos) => {
    contador.escrituras++;
    docs.set(ruta, { datos: copia(datos), version: version(ruta) + 1, escritoEn: ahora() });
  };

  const refDoc = (ruta) => ({
    id: ruta.split('/').pop(),
    path: ruta,
    __ruta: ruta,
    collection: (sub) => refColeccion(`${ruta}/${sub}`),
    get: async () => {
      contador.lecturas++;
      lecturasPorRuta.set(ruta, (lecturasPorRuta.get(ruta) ?? 0) + 1);
      const foto = instantanea(ruta);
      await quizaPausar({ tipo: 'doc', ruta, enTransaccion: false });
      return foto;
    },
    set: async (datos, op) => { escribir(ruta, fusionar(docs.get(ruta)?.datos, datos, op?.merge)); },
    update: async (datos) => {
      if (!docs.has(ruta)) throw error(5, `NOT_FOUND: ${ruta}`);
      escribir(ruta, fusionar(docs.get(ruta).datos, datos, true));
    },
    create: async (datos) => {
      if (docs.has(ruta)) throw error(6, `ALREADY_EXISTS: ${ruta}`);
      escribir(ruta, fusionar(undefined, datos, false));
    },
    delete: async () => { docs.delete(ruta); },
  });

  /** Una consulta: colección (directa), filtros, orden por id, desde, tope y campos. */
  const refColeccion = (coleccion, def = { filtros: [], tope: undefined, desde: undefined, porId: false, campos: undefined }) => {
    const con = (cambio) => refColeccion(coleccion, { ...def, ...cambio });
    const ejecutar = () => {
      const prefijo = `${coleccion}/`;
      let lista = [...docs.entries()]
        .filter(([r]) => r.startsWith(prefijo) && !r.slice(prefijo.length).includes('/'))
        .filter(([, d]) => def.filtros.every(([c, op, v]) => (op === '==' ? campo(d.datos, c) === v
          : op === 'in' ? Array.isArray(v) && v.includes(campo(d.datos, c)) : false)))
        .map(([r]) => r)
        .sort();
      if (def.desde !== undefined) lista = lista.filter((r) => r.slice(prefijo.length) > def.desde);
      if (def.tope !== undefined) lista = lista.slice(0, def.tope);
      return lista;
    };
    const instantaneaDeConsulta = (rutas) => {
      const fotos = rutas.map((r) => {
        const f = instantanea(r);
        if (def.campos) {
          const completo = f.data();
          const parcial = Object.fromEntries(def.campos.filter((c) => completo[c] !== undefined).map((c) => [c, completo[c]]));
          return { ...f, data: () => copia(parcial) };
        }
        return f;
      });
      return { docs: fotos, size: fotos.length, empty: fotos.length === 0 };
    };
    return {
      __coleccion: coleccion,
      __def: def,
      __ejecutar: ejecutar,
      __foto: instantaneaDeConsulta,
      id: coleccion.split('/').pop(),
      doc: (id) => refDoc(`${coleccion}/${id}`),
      where: (c, op, v) => con({ filtros: [...def.filtros, [c, op, v]] }),
      orderBy: (c) => (esIdDeDocumento(c) ? con({ porId: true }) : (() => { throw new Error(`orden no soportado: ${c}`); })()),
      limit: (n) => con({ tope: n }),
      startAfter: (v) => con({ desde: String(v) }),
      select: (...cs) => con({ campos: cs }),
      get: async () => {
        contador.consultas++;
        const rutas = ejecutar();
        contador.lecturas += Math.max(1, rutas.length);
        for (const r of rutas) lecturasPorRuta.set(r, (lecturasPorRuta.get(r) ?? 0) + 1);
        const foto = instantaneaDeConsulta(rutas);
        await quizaPausar({ tipo: 'consulta', coleccion, enTransaccion: false });
        return foto;
      },
    };
  };

  const runTransaction = async (fn, op = {}) => {
    const maximo = op.maxAttempts ?? 5;
    contador.transacciones++;
    for (let intento = 1; intento <= maximo; intento++) {
      const leidos = new Map(); // ruta → versión vista
      const consultas = []; // { q, rutas, versiones }
      const escrituras = [];
      let escrito = false;
      const tx = {
        get: async (objetivo) => {
          if (escrito) throw new Error('Firestore transactions require all reads to be executed before all writes.');
          if (objetivo && objetivo.__ruta) {
            const ruta = objetivo.__ruta;
            contador.lecturas++;
            lecturasPorRuta.set(ruta, (lecturasPorRuta.get(ruta) ?? 0) + 1);
            leidos.set(ruta, version(ruta));
            const foto = instantanea(ruta);
            await quizaPausar({ tipo: 'doc', ruta, enTransaccion: true });
            return foto;
          }
          const rutas = objetivo.__ejecutar();
          contador.consultas++;
          contador.lecturas += Math.max(1, rutas.length);
          for (const r of rutas) lecturasPorRuta.set(r, (lecturasPorRuta.get(r) ?? 0) + 1);
          consultas.push({ q: objetivo, rutas, versiones: rutas.map(version) });
          const foto = objetivo.__foto(rutas);
          await quizaPausar({ tipo: 'consulta', coleccion: objetivo.__coleccion, enTransaccion: true });
          return foto;
        },
        set: (ref, datos, opc) => { escrito = true; escrituras.push(['set', ref.__ruta, datos, opc]); return tx; },
        update: (ref, datos) => { escrito = true; escrituras.push(['update', ref.__ruta, datos]); return tx; },
        create: (ref, datos) => { escrito = true; escrituras.push(['create', ref.__ruta, datos]); return tx; },
        delete: (ref) => { escrito = true; escrituras.push(['delete', ref.__ruta]); return tx; },
      };
      const resultado = await fn(tx);
      await quizaPausar({ tipo: 'confirmar', enTransaccion: true });
      /* Confirmar: todo lo leído tiene que seguir igual, o se repite. */
      const cambiado = [...leidos].some(([r, v]) => version(r) !== v)
        || consultas.some((c) => {
          const ahoraRutas = c.q.__ejecutar();
          return ahoraRutas.length !== c.rutas.length || ahoraRutas.some((r, i) => r !== c.rutas[i] || version(r) !== c.versiones[i]);
        });
      if (cambiado) { contador.reintentos++; continue; }
      for (const [tipo, ruta, datos, opc] of escrituras) {
        if (tipo === 'create' && docs.has(ruta)) throw error(6, `ALREADY_EXISTS: ${ruta}`);
        if (tipo === 'update' && !docs.has(ruta)) throw error(5, `NOT_FOUND: ${ruta}`);
      }
      for (const [tipo, ruta, datos, opc] of escrituras) {
        if (tipo === 'delete') docs.delete(ruta);
        else if (tipo === 'update') escribir(ruta, fusionar(docs.get(ruta).datos, datos, true));
        else if (tipo === 'create') escribir(ruta, fusionar(undefined, datos, false));
        else escribir(ruta, fusionar(docs.get(ruta)?.datos, datos, opc?.merge));
      }
      return resultado;
    }
    throw error(10, 'ABORTED: demasiada contención');
  };

  const db = { collection: (c) => refColeccion(c), runTransaction, doc: (r) => refDoc(r) };

  return {
    db,
    docs,
    contador,
    lecturasPorRuta,
    fijarReloj: (f) => { reloj = f; },
    /** Leer sin contar: para las comprobaciones de la prueba. */
    leer: (ruta) => copia(docs.get(ruta)?.datos),
    poner: (ruta, datos) => escribir(ruta, datos),
    quitar: (ruta) => docs.delete(ruta),
    rutas: (prefijo) => [...docs.keys()].filter((r) => r.startsWith(prefijo)).sort(),
    reiniciarContador: () => { for (const k of Object.keys(contador)) contador[k] = 0; lecturasPorRuta.clear(); },
    /**
     * Una pausa: la `enLaVez`-ésima lectura que cumpla `coincide` espera a que se llame a `soltar()`. `llego` se
     * resuelve cuando la lectura llega a la pausa.
     */
    pausar: (coincide, enLaVez = 1) => {
      let llegada; let soltar;
      const llego = new Promise((r) => { llegada = r; });
      const soltada = new Promise((r) => { soltar = r; });
      const p = { coincide, enLaVez, vistas: 0, activa: true, llegada, soltada };
      pausas.push(p);
      return { llego, soltar: () => soltar() };
    },
    huella: () => JSON.stringify([...docs.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([r, d]) => [r, d.datos])),
  };
};

/** Un Storage de Weë de mentira: el `bucket` de `engine/http`, con generación. */
export const crearStorageFalso = (opciones = {}) => {
  const objetos = new Map(); // clave → { contentType, size, generation, timeCreated, cuerpo }
  let siguiente = 1000;
  const reloj = opciones.reloj ?? (() => Date.now());
  const fallos = new Map(); // clave → { operacion, code } (una vez)
  const llamadas = { getMetadata: 0, delete: 0, precondiciones: [] };
  const ganchosDeMetadatos = new Map(); // clave → async (n) => void
  const nombre = opciones.nombre ?? 'demo-wee.appspot.com';

  const subir = (clave, contentType = 'image/png', size = 10) => {
    siguiente++;
    objetos.set(clave, { contentType, size: String(size), generation: String(siguiente), timeCreated: new Date(reloj()).toISOString() });
    return String(siguiente);
  };
  const tomarFallo = (clave, operacion) => {
    const f = fallos.get(clave);
    if (f && f.operacion === operacion) { fallos.delete(clave); throw Object.assign(new Error(`fallo ${f.code}`), { code: f.code }); }
  };
  const lecturasDeMetadatos = new Map();
  const bucket = {
    name: nombre,
    file: (clave) => ({
      getMetadata: async () => {
        llamadas.getMetadata++;
        const n = (lecturasDeMetadatos.get(clave) ?? 0) + 1;
        lecturasDeMetadatos.set(clave, n);
        tomarFallo(clave, 'getMetadata');
        const o = objetos.get(clave);
        const foto = o ? { ...o } : undefined;
        const g = ganchosDeMetadatos.get(clave);
        if (g) await g(n);
        if (!foto) throw Object.assign(new Error('No such object'), { code: 404 });
        return [foto];
      },
      exists: async () => [objetos.has(clave)],
      delete: async (op = {}) => {
        llamadas.delete++;
        llamadas.precondiciones.push({ clave, ifGenerationMatch: op?.ifGenerationMatch });
        tomarFallo(clave, 'delete');
        const o = objetos.get(clave);
        if (!o) throw Object.assign(new Error('No such object'), { code: 404 });
        if (op?.ifGenerationMatch !== undefined && String(op.ifGenerationMatch) !== o.generation) {
          throw Object.assign(new Error('Precondition Failed'), { code: 412 });
        }
        objetos.delete(clave);
        return [{}];
      },
      save: async (buf, op = {}) => { subir(clave, op?.metadata?.contentType, Buffer.byteLength(buf)); },
    }),
  };
  return {
    bucket,
    objetos,
    llamadas,
    subir,
    /** Sobrescribir: misma clave, generación nueva. */
    sobrescribir: (clave) => subir(clave, objetos.get(clave)?.contentType, 11),
    fallarUnaVez: (clave, operacion, code = 503) => fallos.set(clave, { operacion, code }),
    alLeerMetadatos: (clave, fn) => ganchosDeMetadatos.set(clave, fn),
    existe: (clave) => objetos.has(clave),
    generacion: (clave) => objetos.get(clave)?.generation,
  };
};

/** Un puerto de almacenamiento genérico con generación (para el barrido): registra las precondiciones que recibe. */
export const crearPuertoConGeneracion = (providerId = 'fake', opciones = {}) => {
  const objetos = new Map(); // clave → generación
  let siguiente = 1;
  const llamadas = { borrar: [], mirar: 0 };
  const fallos = [];
  const capacidades = opciones.sinCondicional ? ['object.head', 'object.delete'] : ['object.head', 'object.delete', 'object.conditionalDelete'];
  return {
    objetos,
    llamadas,
    poner: (clave) => { objetos.set(clave, String(++siguiente)); return String(siguiente); },
    fallarUnaVez: (motivo) => fallos.push(motivo),
    puerto: {
      providerId,
      capacidades,
      async guardar() { return { ok: false, error: { code: 'INVALID_REQUEST', source: `storage:${providerId}`, details: { reason: 'peticion_invalida' } } }; },
      async mirar(ref) {
        llamadas.mirar++;
        const g = objetos.get(ref.objectKey);
        return g ? { ok: true, objeto: { ref, bytes: 1, generacion: g } } : { ok: false, motivo: 'no_existe' };
      },
      async borrar(ref, op) {
        llamadas.borrar.push({ clave: ref.objectKey, generacion: op?.generacion });
        const f = fallos.shift();
        if (f) return { ok: false, error: { code: 'PROVIDER_ERROR', source: `storage:${providerId}`, details: { reason: f } } };
        const g = objetos.get(ref.objectKey);
        if (g === undefined) return { ok: true, yaNoEstaba: true };
        if (op?.generacion !== undefined && op.generacion !== g) {
          return { ok: false, error: { code: 'PROVIDER_ERROR', source: `storage:${providerId}`, details: { reason: 'precondicion_fallida' } } };
        }
        objetos.delete(ref.objectKey);
        return { ok: true, yaNoEstaba: false };
      },
    },
  };
};

/**
 * Enchufa los falsos en el compilado: `getFirestore` y `storageBucket`. Devuelve cómo deshacerlo.
 * `libDir` permite cargar una COPIA del compilado (las mutaciones).
 */
export const enchufar = (libDir, fs, st) => {
  const firestore = requireDeFunctions('firebase-admin/firestore');
  const http = requireDeFunctions(path.join(libDir, 'engine/http.js'));
  const antes = { getFirestore: firestore.getFirestore, storageBucket: http.storageBucket, cubo: process.env.STORAGE_BUCKET };
  firestore.getFirestore = () => fs.db;
  http.storageBucket = () => st.bucket;
  process.env.STORAGE_BUCKET = st.bucket.name;
  return () => {
    firestore.getFirestore = antes.getFirestore;
    http.storageBucket = antes.storageBucket;
    if (antes.cubo === undefined) delete process.env.STORAGE_BUCKET; else process.env.STORAGE_BUCKET = antes.cubo;
  };
};

export const requerir = (libDir, p) => requireDeFunctions(path.join(libDir, p));
export const LIB = path.resolve(here, '../lib');
