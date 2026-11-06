#!/usr/bin/env node
/*
 * LO DE LA CUENTA FUERA DEL PERFIL PÚBLICO — PREPARADO, NO EJECUTADO (F-06, P5).
 *
 * `users/{id}` lo lee cualquiera (`allow read: if true`), y los perfiles que ya
 * existen llevan campos que son de la CUENTA, no del perfil: `email`,
 * `realName`, `birthDate`, `gender` (y, si alguna vez se escribió, `pushToken`).
 * Las reglas ya no dejan al cliente volver a escribirlos ahí y el registro los
 * guarda en `users/{id}/private/account`; falta mover lo que ya estaba.
 *
 * Lo que hace, cuando se le autorice, por cada documento de `users`:
 *
 *   · `realName`, `birthDate`, `gender`  → se COPIAN a `users/{id}/private/account`
 *                                          SOLO LAS CLAVES QUE ALLÍ FALTAN (lo que el
 *                                          registro nuevo ya escribió manda) y se
 *                                          BORRAN del perfil público;
 *   · `email`                            → se BORRA del perfil (vive en Firebase Auth);
 *   · `pushToken`, `pushTokenUpdatedAt`  → se BORRAN (el token vive en `pushTokens/{uid}`).
 *
 * Corregido en la F-06 (hallazgo H3 del plan): la versión anterior leía la
 * colección entera de una vez, su `set(..., {merge:true})` SÍ pisaba lo que el
 * registro nuevo había escrito en `private/account`, no dejaba copia para volver
 * atrás y no verificaba nada. Ahora:
 *
 *   · lee `users` POR PÁGINAS (orden por id de documento);
 *   · cada perfil va en UNA transacción que vuelve a leer el perfil y su
 *     `private/account` y solo rellena claves AUSENTES;
 *   · antes de escribir guarda una COPIA de lo que va a quitar (JSON por líneas)
 *     en `--copia <ruta>`, que tiene que estar FUERA del repositorio porque son
 *     datos personales (decisión D4: cifrada y borrada pasados N días);
 *   · `--verificar` cuenta los perfiles que aún llevan esos campos (tiene que ser 0);
 *   · `--restaurar <copia>` es la marcha atrás: vuelve a poner en el perfil lo
 *     que la copia dice que se quitó;
 *   · `--limite N` limpia como mucho N perfiles (canario).
 *
 * Lo que NO hace: no toca ningún otro campo ni ninguna otra colección, no borra
 * documentos, no imprime valores (solo nombres de campo y conteos) y no escribe
 * nada sin LAS DOS banderas.
 *
 * Es IDEMPOTENTE: un perfil ya limpio no entra en el plan.
 *
 * Uso (desde la raíz; el proyecto es OBLIGATORIO):
 *   node scripts/limpiar-cuenta-en-users.mjs --project <p>                         → simulación: el plan, sin escribir
 *   node scripts/limpiar-cuenta-en-users.mjs --project <p> --ejecutar --confirmo-autorizacion --copia <fuera-del-repo>.jsonl [--limite 5]
 *   node scripts/limpiar-cuenta-en-users.mjs --project <p> --verificar
 *   node scripts/limpiar-cuenta-en-users.mjs --project <p> --restaurar <copia>.jsonl [--ejecutar --confirmo-autorizacion]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { admin, bandera, arg } from './media-legacy.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Qué se mueve y qué se borra. Nada más entra aquí. */
const A_PRIVADO = ['realName', 'birthDate', 'gender'];
const SOLO_BORRAR = ['email', 'pushToken', 'pushTokenUpdatedAt'];
export const CAMPOS_DE_CUENTA = Object.freeze([...A_PRIVADO, ...SOLO_BORRAR]);
export const TAM_PAGINA = 300;

/** La copia lleva datos personales: nunca dentro del repositorio. */
export const copiaFueraDelRepo = (ruta) => {
  if (!ruta) return false;
  const abs = path.resolve(ruta);
  const rel = path.relative(RAIZ, abs);
  return rel.startsWith('..') || path.isAbsolute(rel);
};

/* Un Timestamp se guarda en la copia con su forma y vuelve igual. */
const aCopia = (v) => (v && typeof v.toDate === 'function' && typeof v.seconds === 'number' ? { __timestamp: { seconds: v.seconds, nanoseconds: v.nanoseconds } } : v);
const deCopia = (v) => (v && typeof v === 'object' && v.__timestamp ? new admin.firestore.Timestamp(v.__timestamp.seconds, v.__timestamp.nanoseconds) : v);

async function* paginas(db, tam = TAM_PAGINA) {
  let ultimo = null;
  for (;;) {
    let q = db.collection('users').orderBy(admin.firestore.FieldPath.documentId()).limit(tam);
    if (ultimo) q = q.startAfter(ultimo);
    const snap = await q.get();
    if (snap.empty) return;
    yield snap.docs;
    ultimo = snap.docs[snap.docs.length - 1];
    if (snap.size < tam) return;
  }
}

const quePlan = (data) => {
  const mover = A_PRIVADO.filter((k) => data[k] !== undefined);
  const borrar = [...mover, ...SOLO_BORRAR.filter((k) => data[k] !== undefined)];
  return { mover, borrar };
};

/** El plan: qué perfiles tienen algo que limpiar. Solo lee. */
export async function planLimpieza(db, { tam = TAM_PAGINA } = {}) {
  const plan = [];
  let perfiles = 0;
  for await (const docs of paginas(db, tam)) {
    for (const d of docs) {
      perfiles++;
      const { mover, borrar } = quePlan(d.data() || {});
      if (borrar.length) plan.push({ ruta: d.ref.path, mover, borrar });
    }
  }
  return { perfiles, plan };
}

/** P5: limpia, con copia previa y una transacción por perfil. */
export async function limpiar(db, { ejecutar = false, copia, limite = Infinity, tam = TAM_PAGINA } = {}) {
  if (ejecutar && !copiaFueraDelRepo(copia)) throw new Error('Para escribir hace falta --copia <ruta> FUERA del repositorio.');
  const { perfiles, plan } = await planLimpieza(db, { tam });
  const r = { perfiles, conCampos: plan.length, limpiados: 0, clavesAPrivado: 0, clavesQueYaEstaban: 0, pendientesPorLimite: 0, simulacion: !ejecutar };
  for (const p of plan) {
    if (r.limpiados >= limite) { r.pendientesPorLimite++; continue; }
    const hecho = await db.runTransaction(async (tx) => {
      const ref = db.doc(p.ruta);
      const privRef = ref.collection('private').doc('account');
      const snap = await tx.get(ref);
      const priv = await tx.get(privRef);
      const data = snap.data() || {};
      const { mover, borrar } = quePlan(data);
      if (!borrar.length) return null;
      const yaPrivado = priv.exists ? priv.data() || {} : {};
      const faltan = mover.filter((k) => yaPrivado[k] === undefined);
      if (ejecutar) {
        /* La copia se escribe ANTES de confirmar: si la transacción se repite, la línea se repite (restaurar es idempotente). */
        fs.appendFileSync(copia, JSON.stringify({ ruta: p.ruta, campos: Object.fromEntries(borrar.map((k) => [k, aCopia(data[k])])) }) + '\n', { mode: 0o600 });
        if (faltan.length) {
          tx.set(privRef, { ...Object.fromEntries(faltan.map((k) => [k, data[k]])), updatedAt: admin.firestore.Timestamp.now() }, { merge: true });
        }
        tx.update(ref, Object.fromEntries(borrar.map((k) => [k, admin.firestore.FieldValue.delete()])));
      }
      return { aPrivado: faltan.length, yaEstaban: mover.length - faltan.length };
    });
    if (hecho) { r.limpiados++; r.clavesAPrivado += hecho.aPrivado; r.clavesQueYaEstaban += hecho.yaEstaban; }
  }
  return r;
}

/** Verificación: 0 perfiles con campos de cuenta. */
export async function verificarLimpieza(db, { tam = TAM_PAGINA } = {}) {
  const { perfiles, plan } = await planLimpieza(db, { tam });
  return { perfiles, conCampos: plan.length, ok: plan.length === 0 };
}

/** Marcha atrás: vuelve a poner en cada perfil lo que la copia dice que se quitó (nada más). */
export async function restaurar(db, { copia, ejecutar = false } = {}) {
  const lineas = fs.readFileSync(copia, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const r = { lineas: lineas.length, restaurados: 0, perfilesQueNoExisten: 0, simulacion: !ejecutar };
  for (const { ruta, campos } of lineas) {
    if (!/^users\/[^/]+$/.test(ruta)) throw new Error('La copia trae una ruta que no es un perfil.');
    const claves = Object.keys(campos).filter((k) => CAMPOS_DE_CUENTA.includes(k));
    const ref = db.doc(ruta);
    const snap = await ref.get();
    if (!snap.exists) { r.perfilesQueNoExisten++; continue; }
    if (ejecutar) await ref.update(Object.fromEntries(claves.map((k) => [k, deCopia(campos[k])])));
    r.restaurados++;
  }
  return r;
}

/* ── Línea de órdenes ─────────────────────────────────────────────────── */
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const EJECUTAR = bandera('--ejecutar') && bandera('--confirmo-autorizacion');
  if (bandera('--ejecutar') && !EJECUTAR) {
    console.error('Para escribir hacen falta LAS DOS banderas: --ejecutar --confirmo-autorizacion. Sin ellas, simulación.');
    process.exit(2);
  }
  const proyecto = arg('--project');
  if (!proyecto) { console.error('Falta --project: este script no tiene proyecto por defecto.'); process.exit(2); }
  if (process.env.FIRESTORE_EMULATOR_HOST && !proyecto.startsWith('demo-')) {
    console.error('Con un emulador en el entorno, el proyecto tiene que ser demo-*.'); process.exit(2);
  }
  const copia = arg('--copia');
  if (EJECUTAR && !bandera('--restaurar') && !bandera('--verificar') && !copiaFueraDelRepo(copia)) {
    console.error('Para escribir hace falta --copia <ruta> FUERA del repositorio (son datos personales).'); process.exit(2);
  }
  const limite = arg('--limite') !== undefined ? Math.max(0, Math.floor(Number(arg('--limite')))) : Infinity;
  admin.initializeApp({ projectId: proyecto });
  const db = admin.firestore();
  console.log(`\nLIMPIEZA DE CAMPOS DE CUENTA EN users — proyecto ${proyecto} — ${EJECUTAR ? '⚠ ESCRIBIENDO' : 'SIMULACIÓN (no escribe)'}\n`);
  let r;
  if (bandera('--verificar')) r = await verificarLimpieza(db);
  else if (bandera('--restaurar')) r = await restaurar(db, { copia: arg('--restaurar'), ejecutar: EJECUTAR });
  else {
    if (!EJECUTAR) {
      /* Solo NOMBRES de campo en pantalla: los valores son justo lo que no debe salir de aquí. */
      const { plan } = await planLimpieza(db);
      for (const p of plan) console.log(`  mover → private/account: [${p.mover.join(', ')}]`.padEnd(56) + `borrar: [${p.borrar.join(', ')}]`);
    }
    r = await limpiar(db, { ejecutar: EJECUTAR, copia, limite });
  }
  for (const [k, v] of Object.entries(r)) console.log(`  ${k.padEnd(22)} ${v}`);
  if (r.ok === false) { console.log('\n✘ quedan perfiles con campos de cuenta'); process.exit(1); }
  process.exit(0);
}
