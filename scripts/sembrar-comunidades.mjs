/*
 * SEMBRAR LAS COMUNIDADES OFICIALES — una operación de ADMINISTRACIÓN, no de la app.
 *
 * Las comunidades oficiales (`isOfficial: true`) no las puede crear ninguna app: las reglas de Firestore solo dejan a
 * una sesión con el claim `admin`, y así debe ser (una persona cualquiera no puede proclamar «oficial» nada). Antes la
 * app lo intentaba cada vez que veía la colección vacía y las reglas se lo negaban; ahora la app no lo intenta y la
 * siembra la hace este script con el SDK de administración.
 *
 * Qué hace: por cada comunidad de `constants/comunidadesOficiales.ts`, si NO existe ya una con su `slug` (con
 * cualquier identificador: en producción las primeras tienen id automático y no se renombran), la crea con
 * id = slug. Es idempotente y seguro con dos ejecuciones a la vez (`create` falla si el documento ya existe).
 *
 * Qué NO hace: no modifica ni borra ninguna comunidad que ya exista, ni toca otra colección.
 *
 * Uso:
 *   firebase emulators:exec --only firestore --project demo-wee "node scripts/sembrar-comunidades.mjs --ejecutar"
 *       → en el emulador (proyecto demo-*): siembra.
 *   node scripts/sembrar-comunidades.mjs --project get-wee
 *       → PROYECTO REAL: solo enseña el plan (dry-run).
 *   node scripts/sembrar-comunidades.mjs --project get-wee --ejecutar --confirmo-autorizacion
 *       → escribe en el proyecto real. SOLO con autorización explícita del dueño, dada antes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(RAIZ, 'functions/package.json'));
const argumentos = process.argv.slice(2);
const bandera = (b) => argumentos.includes(b);
const valor = (b) => { const i = argumentos.indexOf(b); return i >= 0 ? argumentos[i + 1] : undefined; };

const proyecto = valor('--project') || process.env.GCLOUD_PROJECT || 'demo-wee';
const emulador = process.env.FIRESTORE_EMULATOR_HOST;
const esDemo = proyecto.startsWith('demo-');
/* En un proyecto demo-* basta --ejecutar (no puede llegar a nada real); en uno real hacen falta LAS DOS banderas. */
const ejecutar = esDemo ? bandera('--ejecutar') : bandera('--ejecutar') && bandera('--confirmo-autorizacion');

if (esDemo && !emulador) {
  console.error(`✘ «${proyecto}» es un proyecto de emulador y no hay emulador (FIRESTORE_EMULATOR_HOST). Usa firebase emulators:exec.`);
  process.exit(2);
}
if (!esDemo && emulador) {
  console.error(`✘ Hay un emulador en el entorno y el proyecto «${proyecto}» es real: no se mezclan. Quita uno de los dos.`);
  process.exit(2);
}
if (!esDemo && bandera('--ejecutar') && !ejecutar) {
  console.error('✘ Para escribir en un proyecto real hacen falta LAS DOS banderas: --ejecutar --confirmo-autorizacion. Sin ellas, dry-run.');
  process.exit(2);
}

/* Los datos, del módulo de la app, sin empaquetador. */
const ts = require('typescript');
const transpilar = (rel, sustituir = {}) => {
  let js = ts.transpileModule(fs.readFileSync(path.join(RAIZ, rel), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  for (const [a, b] of Object.entries(sustituir)) js = js.split(a).join(b);
  return 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
};
const categorias = transpilar('constants/communityCategories.ts');
const { OFFICIAL_COMMUNITIES } = await import(transpilar('constants/comunidadesOficiales.ts', { "'./communityCategories'": `'${categorias}'` }));

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: proyecto });
const db = admin.firestore();

console.log(`\nSIEMBRA DE COMUNIDADES OFICIALES — proyecto ${proyecto}${emulador ? ` (emulador ${emulador})` : ''} — ${ejecutar ? 'ESCRIBIENDO' : 'DRY-RUN (no escribe)'}\n`);
const plan = [];
for (const c of OFFICIAL_COMMUNITIES) {
  const ya = await db.collection('communities').where('slug', '==', c.slug).limit(1).get();
  if (ya.empty) plan.push(c);
  else console.log(`  = ${c.slug.padEnd(26)} ya existe (${ya.docs[0].id}): no se toca`);
}
for (const c of plan) console.log(`  + ${c.slug.padEnd(26)} se crea como communities/${c.slug}`);
console.log(`\n${OFFICIAL_COMMUNITIES.length} oficiales · ${plan.length} por crear`);
if (!ejecutar) {
  console.log(esDemo ? 'DRY-RUN: añade --ejecutar para sembrar el emulador.' : 'DRY-RUN: nada escrito. Para escribir: --ejecutar --confirmo-autorizacion, con autorización explícita.');
  process.exit(0);
}
let creadas = 0;
for (const c of plan) {
  try {
    await db.collection('communities').doc(c.slug).create({
      ...c,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    creadas++;
  } catch (e) {
    /* Otra ejecución la creó entre medias: ya existe, que es lo que se quería. */
    if (e?.code === 6 || /already exists/i.test(String(e?.message))) console.log(`  = ${c.slug}: la creó otra ejecución`);
    else throw e;
  }
}
console.log(`creadas: ${creadas}`);
process.exit(0);
