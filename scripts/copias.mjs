#!/usr/bin/env node
/*
 * WEË · COPIA DE SEGURIDAD Y RECUPERACIÓN — LA HERRAMIENTA (docs/BACKUP.md).
 *
 * Las reglas de qué es íntegro viven en el Core (`functions/src/core/backup.ts`),
 * que es puro y se prueba con una tabla de casos. Aquí está lo que el Core no
 * puede saber: cómo se habla con Firestore, con Cloud Storage y con la API de
 * administración. Por eso esto es un script y no código de la aplicación —
 * ninguna Function lo importa y nada de la app depende de él.
 *
 *   node scripts/copias.mjs <orden> [opciones]
 *
 *     cubo                    Crea o revisa el cubo de copias (región, versionado, ciclo, acceso).
 *     huella                  Lee una base entera y escribe su huella. 100% LECTURA.
 *     exportar                Copia gestionada de Firestore al cubo. No toca ningún dato.
 *     importar                Restaura una copia en una base AISLADA. Nunca en producción.
 *     verificar               Compara dos huellas: integridad, identidad, dinero, relaciones, efectos.
 *     romper                  Estropea a propósito la copia RESTAURADA para probar que se detecta.
 *     limpiar                 Borra la base aislada de la prueba.
 *
 * ── Lo que esta herramienta NO hace, por diseño ────────────────────────────
 *
 * No restaura sobre producción: `get-wee` está en una lista de destinos
 * prohibidos y toda orden que escriba lo comprueba dos veces. No borra nada de
 * producción. No toca Credits. No dispara nada: importar en una base CON NOMBRE
 * es, además, un sitio al que ningún disparador de Firestore puede llegar,
 * porque todos los de Weë escuchan sobre `(default)`.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const require = createRequire(path.join(RAIZ, 'functions/package.json'));
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const C = require(path.join(RAIZ, 'functions/lib/core/backup.js'));

/*
 * DÓNDE VIVEN LOS BYTES DE VERDAD, Y SI PODEMOS RECUPERARLOS.
 *
 * Esta tabla está AQUÍ y no en el Core porque nombra empresas, y el Core no
 * nombra proveedores —la misma regla que mantiene al Router sin un `if` por
 * empresa—. Los dominios salen de medir producción, no de suponer
 * (docs/BACKUP.md § 4).
 *
 * Una URL no es una copia: guardar la dirección de una foto no guarda la foto.
 */
const ALMACENES_DE_BYTES = Object.freeze([
  { dominio: 'firebasestorage.app', recuperabilidad: 'RECOVERABLE', porque: 'es un cubo nuestro: se puede copiar entero y volver a poner' },
  { dominio: 'res.cloudinary.com', recuperabilidad: 'PARTIALLY_RECOVERABLE', porque: 'los bytes se bajan por su URL pública, pero Weë sube con un preset SIN FIRMAR y no tiene credencial de administración: no puede enumerar lo que hay ni volver a subirlo con el mismo identificador' },
  { dominio: 'api.dicebear.com', recuperabilidad: 'RECOVERABLE', porque: 'la imagen se genera de la semilla que va en la propia URL: no hay bytes que guardar' },
  { dominio: 'lh3.googleusercontent.com', recuperabilidad: 'NOT_CURRENTLY_RECOVERABLE', porque: 'es la foto de la cuenta de Google de esa persona: no es de Weë' },
  { dominio: 'images.unsplash.com', recuperabilidad: 'NOT_CURRENTLY_RECOVERABLE', porque: 'imagen de terceros de datos de ejemplo; ni es de Weë ni hay copia' },
  { dominio: 'ai.google.dev', recuperabilidad: 'RECOVERABLE', porque: 'enlace a documentación dentro de un registro; no es material de nadie' },
  { dominio: 'ai.dev', recuperabilidad: 'RECOVERABLE', porque: 'enlace a documentación dentro de un registro; no es material de nadie' },
]);

/* ── Lo que no se toca ────────────────────────────────────────────────────── */
const PRODUCCION = 'get-wee';
const DESTINOS_PROHIBIDOS = new Set([`${PRODUCCION}/(default)`, `${PRODUCCION}/default`]);
const CUBO = process.env.WEE_BACKUP_BUCKET || 'wee-backups-546769059837';
const REGION_DEL_CUBO = 'US';
const DIAS_DE_RETENCION = 30;

const arg = (n, pordefecto) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : pordefecto;
};
const hay = (n) => process.argv.includes(`--${n}`);
const orden = process.argv[2];
const PARAR = (m) => { console.error(`\n╔══ DETENIDO ══╗\n${m}\n`); process.exit(1); };
const hash = (t) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');

/* ── Credenciales y APIs ──────────────────────────────────────────────────── */
const apps = new Map();
const appDe = (proyecto) => {
  if (!apps.has(proyecto)) apps.set(proyecto, admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: proyecto }, proyecto));
  return apps.get(proyecto);
};
let token;
const api = async (url, opciones = {}) => {
  if (!token) token = (await appDe(PRODUCCION).options.credential.getAccessToken()).access_token;
  const r = await fetch(url, { ...opciones, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': PRODUCCION, ...(opciones.headers || {}) } });
  const cuerpo = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, cuerpo };
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── Leer una base entera, y traducirla a lo que el Core entiende ─────────── */

/** Los tipos de Firestore que no son JSON, con la forma que el Core declaró. */
const normalizar = (v, prof = 0) => {
  if (v === null || v === undefined) return null;
  if (prof > 32) return { __wee: 'bytes', v: 'profundidad' };
  if (typeof v?.toMillis === 'function') return { __wee: 'ts', v: String(v.toMillis()) };
  if (typeof v?.latitude === 'number' && typeof v?.longitude === 'number') return { __wee: 'geo', v: `${v.latitude},${v.longitude}` };
  if (v instanceof Uint8Array || Buffer.isBuffer(v)) return { __wee: 'bytes', v: Buffer.from(v).toString('base64') };
  if (typeof v?.path === 'string' && typeof v?.id === 'string' && typeof v?.collection === 'function') return { __wee: 'ref', v: v.path };
  if (Array.isArray(v)) return v.map((x) => normalizar(x, prof + 1));
  if (typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normalizar(x, prof + 1)]));
  return v;
};

/**
 * Recorre TODA la base: colecciones raíz y subcolecciones, documento a
 * documento, sin cargar nunca una colección entera en memoria más de lo que
 * dura su huella. El recorrido es por páginas y el resultado son hashes.
 */
const leerBase = async (proyecto, baseId) => {
  const db = baseId ? getFirestore(appDe(proyecto), baseId) : getFirestore(appDe(proyecto));
  const colecciones = [];
  const sinClasificar = [];
  const indice = { ids: {}, porCampo: {}, origenes: {} };
  const camposDeOrigen = {};
  const camposDeDestino = {};
  for (const r of C.RELACIONES) {
    (camposDeOrigen[r.desde] ||= new Set()).add(r.campo);
    if (r.por !== 'id') (camposDeDestino[r.hacia] ||= new Set()).add(r.por);
  }
  let documentos = 0;
  const bytesPorDominio = {};
  /*
   * Los documentos se juntan POR PLANTILLA, no por colección física: los
   * `members` de ocho cuentas son ocho colecciones distintas en Firestore y una
   * sola cosa aquí. Si cada una fuera su propia entrada, la comparación las
   * pisaría entre sí y una copia a la que le faltara un `members` entero daría
   * «idéntica».
   */
  const porPlantilla = new Map();
  /** `accounts` + `members` → `accounts/{accountId}/members`. */
  const plantillaHija = (rutaPadre, hija) => {
    const ultimo = rutaPadre.split('/').pop();
    return `${rutaPadre}/{${ultimo.replace(/s$/, '')}Id}/${hija}`;
  };

  const recorrer = async (col, ruta, prof) => {
    const docs = porPlantilla.get(ruta) || [];
    porPlantilla.set(ruta, docs);
    let cursor;
    for (;;) {
      let q = col.orderBy('__name__').limit(300);
      if (cursor) q = q.startAfter(cursor);
      const snap = await q.get();
      if (snap.empty) break;
      for (const d of snap.docs) {
        const datos = normalizar(d.data());
        docs.push({ ruta: d.ref.path, datos });
        documentos++;
        (indice.ids[ruta] ||= new Set()).add(d.id);
        for (const campo of camposDeDestino[ruta] || []) {
          const v = datos?.[campo];
          if (typeof v === 'string') ((indice.porCampo[ruta] ||= {})[campo] ||= new Set()).add(v);
        }
        for (const campo of camposDeOrigen[ruta] || []) {
          ((indice.origenes[ruta] ||= {})[d.id] ||= {})[campo] = datos?.[campo];
        }
        for (const [, host] of JSON.stringify(datos).matchAll(/https?:\/\/([^/"'\s)]+)/g)) {
          bytesPorDominio[host] = (bytesPorDominio[host] || 0) + 1;
        }
        if (prof < 3) for (const sub of await d.ref.listCollections()) await recorrer(sub, plantillaHija(ruta, sub.id), prof + 1);
      }
      cursor = snap.docs[snap.docs.length - 1];
      if (snap.size < 300) break;
    }
  };

  for (const col of await db.listCollections()) await recorrer(col, col.id, 0);
  for (const [ruta, docs] of porPlantilla) {
    if (docs.length === 0) continue;
    if (!C.clasificarColeccion(ruta).ok) sinClasificar.push(ruta);
    colecciones.push(C.huellaDeColeccion(hash, ruta, docs));
  }
  colecciones.sort((a, b) => (a.ruta < b.ruta ? -1 : 1));
  return { proyecto, baseId: baseId || '(default)', documentos, colecciones, sinClasificar, indice, bytesPorDominio, at: new Date().toISOString() };
};

/** El índice usa `Set`, que no sobrevive a JSON. Se guarda como lista y se vuelve a montar al leer. */
const aJson = (lectura) => ({
  ...lectura,
  indice: {
    ids: Object.fromEntries(Object.entries(lectura.indice.ids).map(([k, v]) => [k, [...v]])),
    porCampo: Object.fromEntries(Object.entries(lectura.indice.porCampo).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([c, s]) => [c, [...s]]))])),
    origenes: lectura.indice.origenes,
  },
});
const deJson = (j) => ({
  ...j,
  indice: {
    ids: Object.fromEntries(Object.entries(j.indice.ids).map(([k, v]) => [k, new Set(v)])),
    porCampo: Object.fromEntries(Object.entries(j.indice.porCampo).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([c, s]) => [c, new Set(s)]))])),
    origenes: j.indice.origenes,
  },
});

/* ── Lo financiero y lo identitario, leídos aparte ───────────────────────── */
const resumenes = async (proyecto, baseId) => {
  const db = baseId ? getFirestore(appDe(proyecto), baseId) : getFirestore(appDe(proyecto));
  const leer = async (c) => (await db.collection(c).get()).docs;
  const [tx, stats, usuarios, cuentas, numeros, entidades] = await Promise.all(
    ['creditTransactions', 'creditStats', 'users', 'accounts', 'accountNumbers', 'entities'].map(leer));
  let membresias = 0;
  for (const c of cuentas) membresias += (await c.ref.collection('members').get()).size;
  const saldos = usuarios.map((d) => d.data().creditsBalance).filter((n) => typeof n === 'number');
  return {
    financiero: {
      creditTransactions: tx.length,
      sumaDeSaldos: saldos.reduce((a, b) => a + b, 0),
      circulating: stats.find((d) => d.id === 'global')?.data()?.circulating ?? null,
      documentosDeCreditStats: stats.length,
      saldos: saldos.slice().sort((a, b) => a - b),
    },
    identidad: {
      accounts: cuentas.length,
      accountNumbers: numeros.length,
      entities: entidades.length,
      memberships: membresias,
      users: usuarios.length,
      tiposDeEntidad: Object.fromEntries(entidades.map((d) => [d.data().entityId, `${d.data().entityType}#${d.data().entitySequence}`])),
      numerosDeCuenta: cuentas.map((d) => d.data().accountNumber).sort(),
    },
  };
};

const RUTA = (n) => path.join(process.env.WEE_BACKUP_DIR || path.join(RAIZ, '.backup-local'), n);
const guardar = (n, o) => { fs.mkdirSync(path.dirname(RUTA(n)), { recursive: true }); fs.writeFileSync(RUTA(n), JSON.stringify(o, null, 2)); return RUTA(n); };
const cargar = (n) => JSON.parse(fs.readFileSync(path.isAbsolute(n) ? n : RUTA(n), 'utf8'));

// ════════════════════════════════════════════════════════════════════════════
if (orden === 'cubo') {
  const existe = await api(`https://storage.googleapis.com/storage/v1/b/${CUBO}?projection=full`);
  if (existe.ok) {
    const b = existe.cuerpo;
    console.log(`El cubo ${CUBO} ya existe.`);
    console.log(`  región ${b.location} (${b.locationType}) · clase ${b.storageClass} · versionado ${b.versioning?.enabled ? 'SÍ' : 'NO'}`);
    console.log(`  acceso público ${b.iamConfiguration?.publicAccessPrevention} · acceso uniforme ${b.iamConfiguration?.uniformBucketLevelAccess?.enabled ? 'SÍ' : 'NO'}`);
    console.log(`  reglas de ciclo de vida: ${(b.lifecycle?.rule || []).map((r) => `${r.action.type} a los ${r.condition.age ?? r.condition.daysSinceNoncurrentTime} días`).join(' · ') || 'ninguna'}`);
    console.log(`  cifrado: ${b.encryption?.defaultKmsKeyName || 'claves gestionadas por Google'}`);
    process.exit(0);
  }
  if (!hay('crear')) PARAR(`El cubo ${CUBO} no existe. Para crearlo: node scripts/copias.mjs cubo --crear`);
  const r = await api(`https://storage.googleapis.com/storage/v1/b?project=${PRODUCCION}`, {
    method: 'POST',
    body: JSON.stringify({
      name: CUBO,
      location: REGION_DEL_CUBO,
      storageClass: 'STANDARD',
      versioning: { enabled: true },
      iamConfiguration: { uniformBucketLevelAccess: { enabled: true }, publicAccessPrevention: 'enforced' },
      lifecycle: { rule: [
        { action: { type: 'Delete' }, condition: { age: DIAS_DE_RETENCION } },
        { action: { type: 'Delete' }, condition: { daysSinceNoncurrentTime: 7, isLive: false } },
      ] },
      labels: { proposito: 'copias-de-firestore', fase: 'f12c' },
    }),
  });
  if (!r.ok) PARAR(`No se pudo crear: ${r.status} ${JSON.stringify(r.cuerpo.error?.message)}`);
  console.log(`Cubo ${CUBO} creado en ${REGION_DEL_CUBO} · versionado · sin acceso público · se borra solo a los ${DIAS_DE_RETENCION} días.`);
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════
if (orden === 'huella') {
  const proyecto = arg('proyecto', PRODUCCION);
  const baseId = arg('db');
  const salida = arg('salida', `huella-${proyecto}-${baseId || 'default'}.json`);
  console.log(`Leyendo ${proyecto}/${baseId || '(default)'} … (solo lectura)`);
  const t0 = Date.now();
  const lectura = await leerBase(proyecto, baseId);
  const extra = await resumenes(proyecto, baseId);
  const completa = { ...aJson(lectura), ...extra, msDeLectura: Date.now() - t0 };
  const ruta = guardar(salida, completa);
  console.log(`  ${lectura.documentos} documentos en ${lectura.colecciones.length} colecciones · ${Date.now() - t0} ms`);
  console.log(`  huella global: ${hash(lectura.colecciones.map((c) => `${c.ruta}:${c.huella}`).join('\n')).slice(0, 32)}`);
  if (lectura.sinClasificar.length) console.log(`  ⚠ SIN CLASIFICAR (no entrarían en ninguna política de copia): ${lectura.sinClasificar.join(', ')}`);
  console.log(`  escrito en ${ruta}`);
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════
if (orden === 'exportar') {
  const prefijo = `gs://${CUBO}/firestore/${arg('etiqueta', new Date().toISOString().replace(/[:.]/g, '-'))}`;
  console.log(`Exportando ${PRODUCCION}/(default) → ${prefijo}`);
  const t0 = Date.now();
  const r = await api(`https://firestore.googleapis.com/v1/projects/${PRODUCCION}/databases/(default):exportDocuments`, {
    method: 'POST', body: JSON.stringify({ outputUriPrefix: prefijo }),
  });
  if (!r.ok) PARAR(`No se pudo exportar: ${r.status} ${JSON.stringify(r.cuerpo.error?.message)}`);
  const op = r.cuerpo.name;
  console.log(`  operación ${op.split('/').pop()}`);
  let estado;
  for (let i = 0; i < 120; i++) {
    await esperar(5000);
    const o = await api(`https://firestore.googleapis.com/v1/${op}`);
    estado = o.cuerpo;
    process.stdout.write(`\r  ${estado.metadata?.operationState} · ${estado.metadata?.progressDocuments?.completedWork || 0} documentos · ${Math.round((Date.now() - t0) / 1000)} s   `);
    if (estado.done) break;
  }
  console.log();
  if (!estado?.done || estado.error) PARAR(`La exportación no terminó bien: ${JSON.stringify(estado?.error || estado?.metadata?.operationState)}`);
  const uri = estado.response?.outputUriPrefix || estado.metadata?.outputUriPrefix;
  guardar('ultima-exportacion.json', { uri, operacion: op, msDeExportacion: Date.now() - t0, documentos: estado.metadata?.progressDocuments?.completedWork, at: new Date().toISOString() });
  console.log(`  LISTO en ${Math.round((Date.now() - t0) / 1000)} s · ${estado.metadata?.progressDocuments?.completedWork} documentos`);
  console.log(`  copia: ${uri}`);
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════
if (orden === 'importar') {
  const proyecto = arg('proyecto');
  const baseId = arg('db');
  const uri = arg('de', (() => { try { return cargar('ultima-exportacion.json').uri; } catch { return undefined; } })());
  if (!proyecto || !baseId) PARAR('Faltan --proyecto y --db. La restauración SIEMPRE va a una base aislada, nunca a la de producción.');
  if (!uri) PARAR('Falta --de gs://…');
  /* Las dos comprobaciones que hacen imposible restaurar encima de producción. */
  if (proyecto === PRODUCCION) PARAR(`DESTINO PROHIBIDO: ${proyecto} es producción. Esta herramienta no restaura ahí.`);
  if (DESTINOS_PROHIBIDOS.has(`${proyecto}/${baseId}`)) PARAR(`DESTINO PROHIBIDO: ${proyecto}/${baseId}.`);
  if (baseId === '(default)' || baseId === 'default') PARAR('La base (default) de cualquier proyecto queda fuera: una restauración se hace en una base CON NOMBRE, donde ningún disparador escucha.');
  if (!hay('confirmo-aislado')) PARAR('Falta --confirmo-aislado.');

  const bases = await api(`https://firestore.googleapis.com/v1/projects/${proyecto}/databases`);
  if (!(bases.cuerpo.databases || []).some((d) => d.name.endsWith(`/databases/${baseId}`))) {
    console.log(`La base ${baseId} no existe en ${proyecto}: creándola …`);
    const c = await api(`https://firestore.googleapis.com/v1/projects/${proyecto}/databases?databaseId=${baseId}`, {
      method: 'POST', body: JSON.stringify({ type: 'FIRESTORE_NATIVE', locationId: arg('region', 'nam5'), concurrencyMode: 'PESSIMISTIC' }),
    });
    if (!c.ok) PARAR(`No se pudo crear la base: ${c.status} ${JSON.stringify(c.cuerpo.error?.message)}`);
    for (let i = 0; i < 60; i++) { await esperar(3000); const o = await api(`https://firestore.googleapis.com/v1/${c.cuerpo.name}`); if (o.cuerpo.done) break; }
    console.log('  creada.');
  }

  console.log(`Restaurando ${uri} → ${proyecto}/${baseId}`);
  const t0 = Date.now();
  const r = await api(`https://firestore.googleapis.com/v1/projects/${proyecto}/databases/${baseId}:importDocuments`, {
    method: 'POST', body: JSON.stringify({ inputUriPrefix: uri }),
  });
  if (!r.ok) PARAR(`No se pudo importar: ${r.status} ${JSON.stringify(r.cuerpo.error?.message)}`);
  let estado;
  for (let i = 0; i < 120; i++) {
    await esperar(5000);
    const o = await api(`https://firestore.googleapis.com/v1/${r.cuerpo.name}`);
    estado = o.cuerpo;
    process.stdout.write(`\r  ${estado.metadata?.operationState} · ${estado.metadata?.progressDocuments?.completedWork || 0} documentos · ${Math.round((Date.now() - t0) / 1000)} s   `);
    if (estado.done) break;
  }
  console.log();
  if (!estado?.done || estado.error) PARAR(`La restauración no terminó bien: ${JSON.stringify(estado?.error)}`);
  guardar('ultima-restauracion.json', { proyecto, baseId, uri, msDeRestauracion: Date.now() - t0, documentos: estado.metadata?.progressDocuments?.completedWork, at: new Date().toISOString() });
  console.log(`  LISTO en ${Math.round((Date.now() - t0) / 1000)} s · ${estado.metadata?.progressDocuments?.completedWork} documentos`);
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════
if (orden === 'verificar') {
  const o = deJson(cargar(arg('original', 'huella-get-wee-default.json')));
  const r = deJson(cargar(arg('restaurada')));
  let fallos = 0;
  const check = (n, c, e = '') => { console.log((c ? '✔ ' : '✘ ') + n + (e ? ` — ${e}` : '')); if (!c) fallos++; };

  console.log(`\n══ INTEGRIDAD · ${o.proyecto}/${o.baseId} → ${r.proyecto}/${r.baseId}\n`);
  const cmp = C.compararHuellas(o.colecciones, r.colecciones);
  check(`1) mismas colecciones: ${cmp.resumen.colecciones}`, cmp.coleccionesAusentes.length === 0, `ausentes: ${cmp.coleccionesAusentes.join(', ')}`);
  check(`2) mismos documentos: ${cmp.resumen.documentosOriginal}`, cmp.resumen.documentosOriginal === cmp.resumen.documentosRestaurado, `original ${cmp.resumen.documentosOriginal} vs restaurado ${cmp.resumen.documentosRestaurado}`);
  check('3) y cada documento es EL MISMO, por su huella', cmp.resumen.conDiferencias === 0,
    cmp.colecciones.filter((c) => !c.iguales).map((c) => `${c.ruta}[faltan ${c.faltan.length}, sobran ${c.sobran.length}, cambian ${c.cambian.length}]`).join(' · '));

  console.log('\n══ IDENTIDAD\n');
  const oi = o.identidad, ri = r.identidad;
  check(`4) cuentas ${oi.accounts} · números ${oi.accountNumbers} · entidades ${oi.entities} · membresías ${oi.memberships} · perfiles ${oi.users}`,
    oi.accounts === ri.accounts && oi.accountNumbers === ri.accountNumbers && oi.entities === ri.entities && oi.memberships === ri.memberships && oi.users === ri.users,
    `restaurado: ${ri.accounts}/${ri.accountNumbers}/${ri.entities}/${ri.memberships}/${ri.users}`);
  check('5) los MISMOS números de cuenta: ninguno se regeneró', JSON.stringify(oi.numerosDeCuenta) === JSON.stringify(ri.numerosDeCuenta));
  check('6) las mismas entidades, con su tipo y su secuencia guardados', JSON.stringify(oi.tiposDeEntidad) === JSON.stringify(ri.tiposDeEntidad),
    `${Object.keys(ri.tiposDeEntidad).length} entidades`);

  console.log('\n══ DINERO\n');
  const of = o.financiero, rf = r.financiero;
  check(`7) movimientos del libro: ${of.creditTransactions}`, of.creditTransactions === rf.creditTransactions, `restaurado ${rf.creditTransactions}`);
  check(`8) circulante: ${of.circulating}`, of.circulating === rf.circulating, `restaurado ${rf.circulating}`);
  check(`9) suma de saldos: ${of.sumaDeSaldos}`, of.sumaDeSaldos === rf.sumaDeSaldos, `restaurado ${rf.sumaDeSaldos}`);
  check('10) y saldo por saldo, no solo la suma', JSON.stringify(of.saldos) === JSON.stringify(rf.saldos));
  check(`11) documentos de estadísticas: ${of.documentosDeCreditStats}`, of.documentosDeCreditStats === rf.documentosDeCreditStats);

  /*
   * UNA COPIA PRESERVA LA REALIDAD; NO LA MEJORA.
   *
   * Lo que decide si la recuperación es buena es que la copia tenga EXACTAMENTE
   * las mismas relaciones que el original — rotas incluidas. Que el original
   * tenga alguna rota es una observación sobre producción, y se informa como
   * tal: arreglarla durante una restauración sería inventar datos, que es justo
   * lo que una restauración no puede hacer.
   */
  console.log('\n══ RELACIONES\n');
  const rotasO = C.verificarRelaciones(o.indice);
  const rotasR = C.verificarRelaciones(r.indice);
  check('12) la copia conserva EXACTAMENTE las mismas relaciones que el original, rotas incluidas',
    JSON.stringify(rotasO) === JSON.stringify(rotasR), `original ${rotasO.length} rotas · restaurado ${rotasR.length}`);
  check('13) ninguna arista se rompió AL RESTAURAR', rotasR.length <= rotasO.length,
    rotasR.slice(0, 5).map((x) => `${x.desde}/${x.documento}.${x.campo}→${x.hacia}: ${x.porque}`).join(' · '));
  console.log(`  ${rotasO.length === 0 ? '·  salud de producción: sin aristas rotas' : `⚠ SALUD DE PRODUCCIÓN (no es un fallo de la copia): ${rotasO.length} arista(s) rota(s) ya en el original`}`);
  for (const x of rotasO.slice(0, 10)) console.log(`     ${x.desde}/${x.documento} · ${x.campo} → ${x.hacia}: ${x.porque}`);

  console.log('\n══ EFECTOS LATERALES · ¿se ejecutó algo al restaurar?\n');
  const efectos = C.efectosLaterales(cmp);
  check('15) no apareció NI UN documento que la copia no trajera', efectos.length === 0 && cmp.coleccionesNuevas.length === 0,
    [...efectos.map((e) => `${e.ruta}: ${e.documentos.length}`), ...cmp.coleccionesNuevas.map((c) => `colección nueva ${c}`)].join(' · '));
  const conDisparador = C.COLECCIONES_CON_DISPARADOR.filter((ruta) => (efectos.find((e) => e.ruta === ruta)?.documentos.length || 0) > 0);
  check('16) y nada en las colecciones que en producción tienen disparador', conDisparador.length === 0, conDisparador.join(', '));

  console.log('\n══ CLASIFICACIÓN\n');
  check('17) ninguna colección quedó sin clasificar', (o.sinClasificar || []).length === 0, (o.sinClasificar || []).join(', '));
  check('18) y la clasificación es coherente: lo derivado dice desde qué se reconstruye', C.clasificacionCoherente().length === 0, C.clasificacionCoherente().join(', '));
  const dominios = Object.keys(o.bytesPorDominio || {});
  const sinAlmacen = C.dominiosSinClasificar(dominios, ALMACENES_DE_BYTES);
  check('19) todo almacén de bytes al que apuntan los datos está clasificado', sinAlmacen.length === 0, `sin clasificar: ${sinAlmacen.join(', ')}`);
  console.log('  dónde viven los bytes, y si se pueden recuperar:');
  for (const d of dominios.sort()) {
    const a = C.recuperabilidadDeUrl(`https://${d}/`, ALMACENES_DE_BYTES);
    console.log(`     ${d.padEnd(32)} ×${String(o.bytesPorDominio[d]).padEnd(4)} ${a ? a.recuperabilidad : '⚠ SIN CLASIFICAR'}`);
  }

  console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ RESTAURACIÓN ÍNTEGRA');
  guardar(`verificacion-${Date.now()}.json`, { fallos, comparacion: cmp.resumen, at: new Date().toISOString() });
  process.exit(fallos ? 1 : 0);
}

// ════════════════════════════════════════════════════════════════════════════
if (orden === 'romper') {
  const proyecto = arg('proyecto');
  const baseId = arg('db');
  if (proyecto === PRODUCCION || !baseId || baseId === '(default)') PARAR('Solo se estropea la base AISLADA de la prueba. Jamás producción.');
  if (!hay('confirmo-aislado')) PARAR('Falta --confirmo-aislado.');
  const db = getFirestore(appDe(proyecto), baseId);
  const modo = arg('modo', 'borrar-documento');
  const registro = [];
  if (modo === 'borrar-documento') {
    const d = (await db.collection('creditTransactions').limit(1).get()).docs[0];
    await d.ref.delete();
    registro.push(`borrado ${d.ref.path}`);
  } else if (modo === 'romper-relacion') {
    const d = (await db.collection('entities').limit(1).get()).docs[0];
    await d.ref.update({ ownerAccountId: 'cuentaQueNoExiste0001' });
    registro.push(`${d.ref.path}.ownerAccountId apunta al vacío`);
  } else if (modo === 'duplicar') {
    const d = (await db.collection('posts').limit(1).get()).docs[0];
    await db.collection('posts').doc(`${d.id}-duplicado`).set(d.data());
    registro.push(`creado posts/${d.id}-duplicado`);
  } else if (modo === 'cambiar-saldo') {
    const d = (await db.collection('users').where('creditsBalance', '>', 0).limit(1).get()).docs[0];
    await d.ref.update({ creditsBalance: d.data().creditsBalance + 1 });
    registro.push(`${d.ref.path}.creditsBalance +1`);
  } else PARAR(`Modo desconocido: ${modo}`);
  console.log(`Corrupción provocada en ${proyecto}/${baseId}: ${registro.join(' · ')}`);
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════
if (orden === 'limpiar') {
  const proyecto = arg('proyecto');
  const baseId = arg('db');
  if (proyecto === PRODUCCION || !baseId || baseId === '(default)' || baseId === 'default') PARAR('Solo se borra la base AISLADA de la prueba.');
  if (!hay('confirmo-aislado')) PARAR('Falta --confirmo-aislado.');
  const r = await api(`https://firestore.googleapis.com/v1/projects/${proyecto}/databases/${baseId}`, { method: 'DELETE' });
  if (!r.ok) PARAR(`No se pudo borrar: ${r.status} ${JSON.stringify(r.cuerpo.error?.message)}`);
  for (let i = 0; i < 60; i++) { await esperar(3000); const o = await api(`https://firestore.googleapis.com/v1/${r.cuerpo.name}`); if (o.cuerpo.done) break; }
  console.log(`Base ${proyecto}/${baseId} borrada. No queda ninguna copia de los datos de producción fuera de ${CUBO}.`);
  process.exit(0);
}

console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].split('\n').slice(1).map((l) => l.replace(/^ \* ?/, '')).join('\n'));
process.exit(2);
