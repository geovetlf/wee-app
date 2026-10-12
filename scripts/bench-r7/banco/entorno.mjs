/**
 * ENTORNO DEL BANCO DE MEDIDA — ronda R7, tarea I.
 *
 * Monta, en UN proceso de Node, todo lo que hace falta para ejecutar el código REAL de
 * `functions/lib` (compilado, sin tocar `functions/src`) sin salir de la máquina:
 *
 *   · un reloj virtual (`reloj-virtual.mjs`),
 *   · un Firestore doble que cuenta RPC y las tarda en tiempo virtual (`firestore-contador.mjs`),
 *   · un Storage doble que solo cuenta y tarda,
 *   · los adaptadores de proveedor REALES del registro (`ADAPTERS`), con `isConfigured` y `run`
 *     sustituidos por dobles con retardo simulado (nunca se llama a una API; ninguna clave).
 *
 * Todo lo demás es el código de producción: el Router (`engine/router.ts`), el libro, el límite por
 * persona, el Credit Engine, `brainChat`, `creatorRun`, el contador de Weë Brain, la puerta del runtime…
 *
 * Reglas del banco:
 *   · no se leen ni escriben archivos `.env*`; no se define ninguna clave;
 *   · no hay red: lo que haga `fetch` se sustituye explícitamente en la prueba que lo necesite;
 *   · el proyecto es `demo-wee` y nada apunta a `get-wee`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearRelojVirtual } from './reloj-virtual.mjs';
import { crearBanco, crearAlmacenDoble, resumir } from './firestore-contador.mjs';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const FUNCTIONS = path.join(RAIZ, 'functions');
export const requerir = createRequire(path.join(FUNCTIONS, 'package.json'));
/**
 * El `lib` que se mide. Por defecto, el compilado de este árbol. `BENCH_R7_LIB=<carpeta>` apunta a otro (una copia con
 * un PROTOTIPO de optimización, hecha fuera del árbol; ver `scripts/bench-r7/14-prototipos.mjs`).
 */
export const LIB = process.env.BENCH_R7_LIB ? path.resolve(process.env.BENCH_R7_LIB) : path.join(FUNCTIONS, 'lib');
export const lib = (rel) => requerir(path.join(LIB, rel));

process.env.GCLOUD_PROJECT = 'demo-wee';
process.env.GOOGLE_CLOUD_PROJECT = 'demo-wee';

/** Un usuario con forma de uid de Firebase Auth. */
export const UID = (n = 1) => `UsuarioDePrueba${String(n).padStart(11, '0')}`;

export function prepararEntorno({ latencia = {}, latenciaAlmacen = {} } = {}) {
  const reloj = crearRelojVirtual();
  reloj.instalar();
  const banco = crearBanco({ reloj, latencia });
  const almacen = crearAlmacenDoble({ reloj, banco, latencia: latenciaAlmacen });

  const fa = requerir('firebase-admin/firestore');
  const st = requerir('firebase-admin/storage');
  const originales = { getFirestore: fa.getFirestore, getStorage: st.getStorage };
  fa.getFirestore = () => banco;
  st.getStorage = almacen.getStorage;

  /* ── Adaptadores: los reales del registro, con run/isConfigured sustituidos ── */
  const { ADAPTERS } = lib('engine/registry.js');
  const respaldoDeAdaptadores = new Map();
  const llamadasDeProveedor = [];
  /**
   * Sustituye `run` (y `isConfigured`) de un adaptador real por un doble.
   * `responder(req, n)` devuelve el `ProviderResult` y puede esperar con `reloj.dormir`.
   */
  const simular = (id, responder, { configurado = true } = {}) => {
    const adaptador = ADAPTERS[id];
    if (!respaldoDeAdaptadores.has(id)) respaldoDeAdaptadores.set(id, { run: adaptador.run, isConfigured: adaptador.isConfigured });
    adaptador.isConfigured = () => configurado;
    adaptador.run = async (req) => {
      const llamada = { provider: id, capability: req.capability, model: req.model?.id, desde: reloj.ahora, input: req.input, prefs: req.prefs, ctx: req.ctx };
      llamadasDeProveedor.push(llamada);
      try {
        return await responder(req, llamadasDeProveedor.filter((l) => l.provider === id).length, llamada);
      } finally {
        llamada.hasta = reloj.ahora;
      }
    };
  };

  const restaurar = () => {
    for (const [id, o] of respaldoDeAdaptadores) {
      ADAPTERS[id].run = o.run;
      ADAPTERS[id].isConfigured = o.isConfigured;
    }
    fa.getFirestore = originales.getFirestore;
    st.getStorage = originales.getStorage;
    reloj.restaurar();
  };

  /** Hace caducar todas las cachés de 60 s y olvida lo que el proceso recordaba. */
  const enfriarCaches = () => {
    reloj.adelantar(61_000);
    lib('engine/config.js').invalidateConfig();
    lib('credits/creditCosts.js').invalidateCostOverrides();
    lib('runtime/configuracion.js').olvidarLaPuerta();
    lib('elements/contexto.js').olvidarElContexto();
    lib('engine/index.js').engine.health.reset();
  };

  /** Una cuenta con perfil real, saldo y bienvenida ya dada (así `ensureAccount` no escribe). */
  const { Timestamp } = fa;
  const sembrarCuenta = (uid, saldo = 240) => {
    banco.sembrar(`users/perfil_${uid}`, {
      uid, displayName: uid, profileType: 'real',
      creditsBalance: saldo, creditsLifetimeEarned: saldo, creditsLifetimeSpent: 0, creditsInitializedAt: Timestamp.now(),
    });
    banco.sembrar(`creditTransactions/grant_welcome_${uid}`, { userId: uid, type: 'grant', amount: 240, status: 'COMPLETED', requestId: `grant_welcome_${uid}` });
  };

  /** Vacía la base y el registro (no toca el reloj ni las cachés del código: usa `enfriarCaches` para eso). */
  const reiniciarBase = () => {
    banco.docs.clear();
    banco.log.length = 0;
    banco.conflictos = 0;
    banco.fallos.length = 0;
    llamadasDeProveedor.length = 0;
    almacen.llamadas.length = 0;
  };

  /** Ejecuta `fn` bajo el reloj virtual SIN medirla (preparar datos con código real que toca el doble); devuelve su valor o lanza su error. */
  const preparar = async (fn) => {
    const consola = silenciarConsola();
    try {
      const r = await reloj.correr(fn);
      if (r.error) throw r.error;
      return r.valor;
    } finally {
      consola.restaurar();
    }
  };

  /** Ejecuta `fn` bajo el reloj virtual midiendo lo que hace con el banco; la consola de la librería se captura. */
  const medir = async (fn) => {
    const marca = banco.marca();
    const proveedorAntes = llamadasDeProveedor.length;
    const consola = silenciarConsola();
    let r;
    try {
      r = await reloj.correr(fn);
    } finally {
      consola.restaurar();
    }
    const entradas = banco.desde(marca);
    return { ...r, entradas, resumen: resumir(entradas), lineasDeLog: consola.lineas, proveedor: llamadasDeProveedor.length - proveedorAntes, llamadasProveedor: llamadasDeProveedor.slice(proveedorAntes) };
  };

  return { reloj, banco, almacen, simular, restaurar, enfriarCaches, sembrarCuenta, reiniciarBase, medir, preparar, llamadasDeProveedor, ADAPTERS, resumir, Timestamp };
}

/** Captura (y silencia) lo que la librería escribe en la consola; devuelve las líneas. */
export const silenciarConsola = () => {
  const lineas = [];
  const originales = { log: console.log, warn: console.warn, error: console.error, info: console.info, debug: console.debug };
  const capturar = (nivel) => (...args) => lineas.push({ nivel, texto: args.map((a) => (typeof a === 'string' ? a : (a && a.message) || JSON.stringify(a))).join(' ') });
  for (const k of Object.keys(originales)) console[k] = capturar(k);
  return { lineas, restaurar: () => Object.assign(console, originales) };
};

/** Texto de prueba de N caracteres, estable. */
export const texto = (n, semilla = 'Weë Brain responde con una explicación clara y ordenada. ') => {
  let s = '';
  while (s.length < n) s += semilla;
  return s.slice(0, n);
};

/** Tokens estimados como lo hace el propio código (`estimateInputTokens`): caracteres / 4. */
export const tokensDe = (caracteres) => Math.ceil(caracteres / 4);

/** Formatea una tabla Markdown. */
export const tabla = (cabeceras, filas) => {
  const linea = (celdas) => `| ${celdas.join(' | ')} |`;
  return [linea(cabeceras), linea(cabeceras.map(() => '---')), ...filas.map((f) => linea(f.map((c) => String(c))))].join('\n');
};

/** Mediana de una lista numérica. */
export const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return NaN;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
