/*
 * H5/H2 · LA MIGRACIÓN DEL ÍNDICE DE REFERENCIAS — HERRAMIENTA LOCAL, SOLO CONTRA EL EMULADOR.
 *
 * Crea las filas (`mediaObjects/{objectRef}/referencias/{refId}`) y los registros de objeto que faltan para los
 * materiales que YA existen, con las MISMAS funciones puras que usa la escritura (`filasEsperadasDeLaFicha`). La
 * identidad antes que los bytes (MC-6): no crea fichas, no crea objetos, no mueve bytes, no borra nada y no marca
 * cobertura (eso es de la reconciliación completa, §9.3 del diseño).
 *
 *   --modo dry-run    lo que haría, sin una sola escritura
 *   --modo backfill   escribe lo que falta, página a página, reanudable (`migracion-indice/{runId}`) e idempotente
 *   --modo verificar  compara el índice con la verdad (las fichas) y cuenta las diferencias, sin escribir
 *   --modo sombra     calcula la decisión de siempre («¿otra ficha viva usa el objeto?», leyendo la cuenta) y la del
 *                     índice, y apunta las diferencias en `migracion-indice/{runId}/diferencias`; no actúa
 *
 *   --cuenta <id>  solo una cuenta     --run <runId>  reanudar (backfill) o nombrar la pasada
 *   --por-pagina N (200)               --paginas N    tope de páginas de esta pasada
 *
 * SE NIEGA a correr si el proyecto no es `demo-*`, si no hay emulador local de Firestore o si hay credenciales en el
 * entorno (`GOOGLE_APPLICATION_CREDENTIALS` y similares). No hay bandera para saltarse eso: contra producción esto no
 * se ejecuta (A-08 del diseño exige otra autorización y otra herramienta).
 *
 *   firebase emulators:exec --only firestore --project demo-wee "node scripts/indice-activos.mjs --modo dry-run"
 */
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '..');
const requireDeFunctions = createRequire(path.join(RAIZ, 'functions/package.json'));

export const COLECCION_DE_EJECUCIONES = 'migracion-indice';
const CAMPOS = ['assetId', 'ownerAccountId', 'status', 'storageRef', 'variants', 'previousVersionId', 'kind'];
const CONCESION_MS = 5 * 60 * 1000;
const VARIABLES_DE_CREDENCIALES = ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN', 'GOOGLE_OAUTH_ACCESS_TOKEN', 'CLOUDSDK_AUTH_ACCESS_TOKEN', 'CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE'];

/**
 * ¿SE PUEDE CORRER AQUÍ? Antes de importar nada que pueda hablar con un servidor. Solo `demo-*`, solo con el emulador
 * local de Firestore en el entorno y sin credenciales. Devuelve el motivo si no.
 */
export const comprobarEntorno = (env = process.env, opciones = {}) => {
  const proyecto = opciones.proyecto ?? env.GCLOUD_PROJECT ?? env.GOOGLE_CLOUD_PROJECT;
  if (typeof proyecto !== 'string' || !/^demo-[a-z0-9-]{1,60}$/.test(proyecto)) {
    return { ok: false, motivo: `solo se ejecuta contra un proyecto demo-* de los emuladores; llegó «${proyecto ?? '(ninguno)'}»` };
  }
  const host = env.FIRESTORE_EMULATOR_HOST;
  if (!host) return { ok: false, motivo: 'no hay FIRESTORE_EMULATOR_HOST: esto solo corre contra el emulador' };
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/.test(host)) return { ok: false, motivo: 'el emulador de Firestore tiene que ser local' };
  const credenciales = VARIABLES_DE_CREDENCIALES.filter((k) => env[k]);
  if (credenciales.length) return { ok: false, motivo: `hay credenciales en el entorno (${credenciales.join(', ')}): se niega a correr` };
  return { ok: true, proyecto };
};

/** El contexto: Firestore del emulador y las funciones puras del compilado de siempre. */
export const crearContexto = (proyecto, libDir = path.join(RAIZ, 'functions/lib')) => {
  const admin = requireDeFunctions('firebase-admin');
  const { getFirestore, FieldPath } = requireDeFunctions('firebase-admin/firestore');
  if (!admin.apps.length) admin.initializeApp({ projectId: proyecto });
  const core = requireDeFunctions(path.join(libDir, 'core/index.js'));
  const content = requireDeFunctions(path.join(libDir, 'content/index.js'));
  const indice = requireDeFunctions(path.join(libDir, 'content/indice.js'));
  return { db: getFirestore(), FieldPath, core, content, indice, huella: indice.huellaDelIndice, indexable: content.entraEnElIndice };
};

const limpiar = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const mismoObjeto = (a, b) => !!a && !!b && a.provider === b.provider && (a.bucket ?? '') === (b.bucket ?? '') && a.objectKey === b.objectKey;

/** Las fichas, por páginas con cursor estable. Solo los campos que hacen falta: el contenido de un texto no se lee. */
const paginaDeFichas = async (ctx, { cuenta, cursor, porPagina }) => {
  let q = ctx.db.collection('assets');
  if (cuenta) q = q.where('ownerAccountId', '==', cuenta);
  q = q.orderBy(ctx.FieldPath.documentId()).select(...CAMPOS).limit(porPagina);
  if (cursor) q = q.startAfter(cursor);
  const s = await q.get();
  return s.docs.map((d) => ({ ...d.data(), assetId: d.id }));
};

const refDeObjeto = (ctx, objectRef) => ctx.db.collection(ctx.indice.COLECCION_DE_OBJETOS_DEL_INDICE).doc(objectRef);
const refDeFila = (ctx, objectRef, refId) => refDeObjeto(ctx, objectRef).collection(ctx.indice.SUBCOLECCION_DE_REFERENCIAS).doc(refId);

const informeVacio = (modo, runId) => ({
  modo, runId, paginas: 0, fichas: 0, porEstado: {}, fueraDelIndice: 0,
  filasEsperadas: 0, filasEsperadasVivas: 0, filasPresentes: 0, filasQueFaltan: 0, filasConVivaDistinta: 0,
  registrosEsperados: 0, registrosPresentes: 0, registrosQueFaltan: 0,
  filasCreadas: 0, registrosCreados: 0, diferencias: 0, discrepancias: {}, escrituras: 0, completo: false, cursor: undefined,
});

/* ── dry-run: contar, sin escribir ───────────────────────────────────────────── */
const contarPagina = async (ctx, fichas, informe) => {
  for (const f of fichas) {
    informe.fichas++;
    informe.porEstado[f.status] = (informe.porEstado[f.status] ?? 0) + 1;
    const refs = [f.storageRef, ...(f.variants ?? []).map((v) => v.storageRef)].filter(Boolean);
    const esperadas = ctx.core.filasEsperadasDeLaFicha(ctx.huella, f, ctx.indexable);
    informe.fueraDelIndice += refs.length - new Set(esperadas.map((e) => `${e.ref.provider}|${e.ref.bucket ?? ''}|${e.ref.objectKey}`)).size;
    for (const e of esperadas) {
      informe.filasEsperadas++;
      if (e.viva) informe.filasEsperadasVivas++;
      const s = await refDeFila(ctx, e.objectRef, e.refId).get();
      if (!s.exists) informe.filasQueFaltan++;
      else { informe.filasPresentes++; if (s.data().viva !== e.viva) informe.filasConVivaDistinta++; }
    }
    /* Una subida en curso no tiene registro todavía: nace al confirmarse los bytes (igual que en crearMaterialParaSubida). */
    const conRegistro = f.status !== 'uploading';
    for (const objectRef of new Set(esperadas.filter((e) => e.viva && conRegistro).map((e) => e.objectRef))) {
      informe.registrosEsperados++;
      if ((await refDeObjeto(ctx, objectRef).get()).exists) informe.registrosPresentes++; else informe.registrosQueFaltan++;
    }
  }
};

/* ── backfill: lo que falta, ficha a ficha, cada una en su transacción ───────── */
const completarFicha = async (ctx, assetId, informe, almacen) => {
  const fichaRef = ctx.db.collection('assets').doc(assetId);
  /* Lo que el almacén diga se pregunta FUERA de la transacción; dentro solo se escribe lo que falta. */
  const previa = (await fichaRef.get()).data();
  const hechos = new Map();
  if (almacen && previa) {
    for (const e of ctx.core.filasEsperadasDeLaFicha(ctx.huella, { ...previa, assetId }, ctx.indexable)) {
      const p = almacen[e.ref.provider];
      if (!p || hechos.has(e.objectRef)) continue;
      const m = await p.mirar(e.ref);
      if (m.ok) hechos.set(e.objectRef, { existe: true, ...(m.objeto.generacion ? { generacion: m.objeto.generacion } : {}) });
    }
  }
  const hecho = await ctx.db.runTransaction(async (tx) => {
    const at = Date.now();
    const s = await tx.get(fichaRef);
    if (!s.exists) return { filas: 0, registros: 0 };
    const f = { ...s.data(), assetId };
    const esperadas = ctx.core.filasEsperadasDeLaFicha(ctx.huella, f, ctx.indexable);
    const filas = [];
    for (const e of esperadas) filas.push({ e, s: await tx.get(refDeFila(ctx, e.objectRef, e.refId)) });
    /* Sin registro para una subida en curso: sus bytes pueden no existir, y un registro impediría reintentar la subida. */
    const objetos = f.status === 'uploading' ? [] : [...new Set(esperadas.filter((e) => e.viva).map((e) => e.objectRef))];
    const registros = [];
    for (const o of objetos) registros.push({ o, e: esperadas.find((x) => x.objectRef === o), s: await tx.get(refDeObjeto(ctx, o)) });
    let nFilas = 0;
    let nRegistros = 0;
    for (const { e, s: fs } of filas) {
      if (fs.exists) continue;
      tx.set(refDeFila(ctx, e.objectRef, e.refId), ctx.indice.filaNueva(e, e.viva, at));
      nFilas++;
    }
    for (const { o, e, s: rs } of registros) {
      if (rs.exists) continue;
      /* Sin cobertura: la marca una reconciliación completa, nunca el backfill (§9.3). */
      const nuevo = ctx.indice.registroNuevo(e, hechos.get(o), undefined, at);
      if (!ctx.core.registroDelIndiceValido(ctx.huella, nuevo)) continue;
      tx.set(refDeObjeto(ctx, o), limpiar(nuevo));
      nRegistros++;
    }
    return { filas: nFilas, registros: nRegistros };
  });
  informe.filasCreadas += hecho.filas;
  informe.registrosCreados += hecho.registros;
  informe.escrituras += hecho.filas + hecho.registros;
};

/** Un solo trabajador por ejecución: la concesión del documento de la ejecución, como el cerrojo de un objeto. */
const tomarEjecucion = async (ctx, runId, trabajador, modo) => ctx.db.runTransaction(async (tx) => {
  const ref = ctx.db.collection(COLECCION_DE_EJECUCIONES).doc(runId);
  const s = await tx.get(ref);
  const d = s.exists ? s.data() : undefined;
  const ahora = Date.now();
  if (d && d.concesion && d.concesion.trabajador !== trabajador && d.concesion.hasta > ahora && !d.terminado) {
    throw new Error('otra pasada tiene esta ejecución: se espera a que su concesión caduque');
  }
  tx.set(ref, limpiar({ ...(d ?? { modo, creadoEn: ahora }), concesion: { trabajador, hasta: ahora + CONCESION_MS }, actualizadoEn: ahora }));
  return d;
});

const apuntarPagina = async (ctx, runId, trabajador, cambios) => ctx.db.runTransaction(async (tx) => {
  const ref = ctx.db.collection(COLECCION_DE_EJECUCIONES).doc(runId);
  const s = await tx.get(ref);
  const d = s.exists ? s.data() : {};
  if (d.concesion && d.concesion.trabajador !== trabajador) throw new Error('la concesión de la ejecución es de otro: se para');
  const ahora = Date.now();
  tx.set(ref, limpiar({ ...d, ...cambios, concesion: { trabajador, hasta: ahora + CONCESION_MS }, actualizadoEn: ahora }));
});

/* ── verificar: el índice frente a la verdad ─────────────────────────────────── */
const verificarTodo = async (ctx, opciones, informe) => {
  const vivasEsperadas = new Map(); // objectRef → Set(refId)
  const vistas = new Set();
  const conRegistro = new Set(); // objetos de fichas vivas que no están subiendo: deben tener registro
  let cursor;
  const sumar = (k) => { informe.discrepancias[k] = (informe.discrepancias[k] ?? 0) + 1; };
  for (;;) {
    const fichas = await paginaDeFichas(ctx, { cuenta: opciones.cuenta, cursor, porPagina: opciones.porPagina });
    informe.paginas++;
    for (const f of fichas) {
      informe.fichas++;
      for (const e of ctx.core.filasEsperadasDeLaFicha(ctx.huella, f, ctx.indexable)) {
        vistas.add(e.objectRef);
        if (e.viva) vivasEsperadas.set(e.objectRef, new Set([...(vivasEsperadas.get(e.objectRef) ?? []), e.refId]));
        if (e.viva && f.status !== 'uploading') conRegistro.add(e.objectRef);
        const s = await refDeFila(ctx, e.objectRef, e.refId).get();
        if (!s.exists) { if (e.viva) sumar('fila_ausente'); continue; }
        if (s.data().viva !== e.viva) sumar('fila_con_viva_distinta');
      }
    }
    if (fichas.length < opciones.porPagina) break;
    cursor = fichas[fichas.length - 1].assetId;
  }
  for (const objectRef of vistas) {
    const filas = await refDeObjeto(ctx, objectRef).collection(ctx.indice.SUBCOLECCION_DE_REFERENCIAS).limit(ctx.indice.LIMITE_DE_FILAS_DE_UN_OBJETO + 1).get();
    const esperadas = vivasEsperadas.get(objectRef) ?? new Set();
    for (const d of filas.docs) if (d.data().viva === true && !esperadas.has(d.id)) sumar('fila_viva_de_mas');
    if (conRegistro.has(objectRef) && !(await refDeObjeto(ctx, objectRef).get()).exists) sumar('registro_ausente');
  }
  informe.completo = true;
};

/* ── sombra: la decisión de siempre frente a la del índice ───────────────────── */
const sombraDePagina = async (ctx, fichas, informe, runId, cacheDeCuentas) => {
  for (const f of fichas) {
    informe.fichas++;
    if (f.status === 'deleted') continue;
    const esperadas = ctx.core.filasEsperadasDeLaFicha(ctx.huella, f, ctx.indexable);
    const porObjeto = new Map();
    for (const e of esperadas) porObjeto.set(e.objectRef, [...(porObjeto.get(e.objectRef) ?? []), e]);
    if (!cacheDeCuentas.has(f.ownerAccountId)) cacheDeCuentas.set(f.ownerAccountId, await ctx.content.fichasDeLaCuenta(f.ownerAccountId));
    for (const [objectRef, propias] of porObjeto) {
      const antigua = await ctx.content.fichaVivaUsaElObjeto(cacheDeCuentas.get(f.ownerAccountId), f.assetId, propias[0].ref);
      const mias = new Set(propias.map((p) => p.refId));
      const vivas = await refDeObjeto(ctx, objectRef).collection(ctx.indice.SUBCOLECCION_DE_REFERENCIAS).where('viva', '==', true).limit(propias.length + 1).get();
      const porClave = await ctx.db.collection('assets').where('storageRef.objectKey', '==', propias[0].ref.objectKey).limit(25).get();
      const nueva = vivas.docs.some((d) => !mias.has(d.id))
        || porClave.docs.some((d) => d.id !== f.assetId && d.data().status !== 'deleted' && mismoObjeto(d.data().storageRef, propias[0].ref));
      if (antigua === nueva) continue;
      informe.diferencias++;
      await ctx.db.collection(COLECCION_DE_EJECUCIONES).doc(runId).collection('diferencias').doc(`${f.assetId}_${objectRef}`)
        .set({ assetId: f.assetId, objectRef, antigua, nueva, en: Date.now() });
      informe.escrituras++;
    }
  }
};

/**
 * EJECUTAR UNA PASADA. `detenerTrasPaginas` simula una caída (las pruebas la usan); `alTerminarPagina` deja meter
 * cambios entre páginas. Devuelve el informe.
 */
export const ejecutarMigracion = async (ctx, opciones = {}) => {
  const modo = opciones.modo ?? 'dry-run';
  if (!['dry-run', 'backfill', 'verificar', 'sombra'].includes(modo)) throw new Error(`modo desconocido: ${modo}`);
  const porPagina = Math.max(1, Math.min(500, Number(opciones.porPagina ?? 200)));
  const maxPaginas = Math.max(1, Number(opciones.paginas ?? 1e6));
  const runId = opciones.runId ?? `${modo}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const informe = informeVacio(modo, runId);
  const trabajador = opciones.trabajador ?? randomUUID();

  if (modo === 'verificar') { await verificarTodo(ctx, { cuenta: opciones.cuenta, porPagina }, informe); return informe; }

  let cursor;
  if (modo === 'backfill') {
    const previa = await tomarEjecucion(ctx, runId, trabajador, modo);
    if (previa?.terminado) return { ...informe, completo: true, cursor: previa.cursor };
    cursor = previa?.cursor;
    for (const k of ['paginas', 'fichas', 'filasCreadas', 'registrosCreados']) informe[k] = previa?.[k] ?? 0;
  }
  const cacheDeCuentas = new Map();
  for (let p = 0; p < maxPaginas; p++) {
    const fichas = await paginaDeFichas(ctx, { cuenta: opciones.cuenta, cursor, porPagina });
    if (modo === 'dry-run') await contarPagina(ctx, fichas, informe);
    else if (modo === 'sombra') await sombraDePagina(ctx, fichas, informe, runId, cacheDeCuentas);
    else {
      for (const f of fichas) { informe.fichas++; await completarFicha(ctx, f.assetId, informe, opciones.almacen); }
    }
    informe.paginas++;
    const ultima = fichas.length < porPagina;
    cursor = fichas.length ? fichas[fichas.length - 1].assetId : cursor;
    informe.cursor = cursor;
    if (modo === 'backfill') {
      await apuntarPagina(ctx, runId, trabajador, {
        modo, cursor, paginas: informe.paginas, fichas: informe.fichas, filasCreadas: informe.filasCreadas, registrosCreados: informe.registrosCreados,
        ...(ultima ? { terminado: true } : {}),
      });
    }
    if (opciones.alTerminarPagina) await opciones.alTerminarPagina(p, informe);
    if (ultima) { informe.completo = true; break; }
    if (opciones.detenerTrasPaginas !== undefined && p + 1 >= opciones.detenerTrasPaginas) break;
  }
  return informe;
};

const argumento = (args, nombre, porDefecto) => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : porDefecto; };

const principal = async () => {
  const args = process.argv.slice(2);
  const entorno = comprobarEntorno(process.env, { proyecto: argumento(args, '--proyecto', undefined) });
  if (!entorno.ok) { console.error(`✘ indice-activos: ${entorno.motivo}`); process.exit(3); }
  const ctx = crearContexto(entorno.proyecto);
  const informe = await ejecutarMigracion(ctx, {
    modo: argumento(args, '--modo', 'dry-run'),
    cuenta: argumento(args, '--cuenta', undefined),
    runId: argumento(args, '--run', undefined),
    porPagina: argumento(args, '--por-pagina', 200),
    paginas: argumento(args, '--paginas', undefined),
  });
  /* Solo números, motivos e identificadores derivados: ni una clave de objeto, ni una dirección. */
  console.log(JSON.stringify(informe, null, 2));
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().catch((e) => { console.error(`✘ indice-activos: ${e instanceof Error ? e.message : String(e)}`); process.exit(2); });
}
