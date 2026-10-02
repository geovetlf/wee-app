/*
 * SEMBRAR LAS COMUNIDADES OFICIALES — una operación de ADMINISTRACIÓN, no de la app.
 *
 * Las comunidades oficiales (`isOfficial: true`) no las puede crear ninguna app: las reglas de Firestore solo dejan a
 * una sesión con el claim `admin`, y así debe ser (una persona cualquiera no puede proclamar «oficial» nada). Antes la
 * app lo intentaba cada vez que veía la colección vacía y las reglas se lo negaban; ahora la app no lo intenta y la
 * siembra la hace este script con el SDK de administración.
 *
 * Qué hace: por cada comunidad de `constants/comunidadesOficiales.ts`, si NO existe ya una OFICIAL con su `slug` (con
 * cualquier identificador: en producción las primeras tienen id automático y no se renombran), la crea con
 * id = slug. Es idempotente.
 *
 * Qué NO hace: no modifica, no borra y no se apropia de ninguna comunidad que ya exista, ni toca otra colección.
 *
 * CONFLICTOS — el sitio de una oficial ocupado por algo que no es la oficial:
 *   · una comunidad NO oficial con el slug de una oficial (la de una persona que llegó antes), o
 *   · el documento `communities/<slug>` ocupado por otra cosa (no oficial, u oficial con otro slug).
 * Antes el primero se daba por «ya existe: no se toca» y el segundo por «la creó otra ejecución», así que la oficial
 * no llegaba a existir nunca y la de la persona ocupaba su sitio. Ahora cualquier conflicto se INFORMA y el script
 * FALLA (código 3) sin escribir NADA —tampoco las oficiales que no tienen conflicto—: una siembra a medias sobre un
 * catálogo ocupado deja peor estado que ninguna, y decidir qué se hace con la comunidad de una persona es de una
 * persona, no de un script. Con --ejecutar, la lectura y la escritura van en UNA transacción: si algo cambia entre
 * medias, se vuelve a decidir con lo nuevo.
 *
 * Uso:
 *   firebase emulators:exec --only firestore --project demo-wee "node scripts/sembrar-comunidades.mjs --ejecutar"
 *       → en el emulador (proyecto demo-*): siembra.
 *   node scripts/sembrar-comunidades.mjs --project <proyecto-real>
 *       → PROYECTO REAL: solo enseña el plan (dry-run).
 *   node scripts/sembrar-comunidades.mjs --project <proyecto-real> --ejecutar --confirmo-autorizacion
 *       → escribe en el proyecto real. SOLO con autorización explícita del dueño, dada antes.
 *
 * Códigos de salida: 0 bien · 2 el modo no es seguro (no se toca la red) · 3 conflicto (no se escribe nada).
 *
 * La decisión de modo (`decidirModo`) y la de qué crear (`clasificar`) son puras y se exportan: las pruebas las
 * ejecutan sin lanzar este script contra ningún proyecto.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const CODIGO_NEGADO = 2;
export const CODIGO_CONFLICTO = 3;

/* Un identificador de proyecto de Google Cloud: 6–30 caracteres, minúsculas, dígitos y guiones, empieza por letra. */
const FORMA_DE_PROYECTO = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

/**
 * EN QUÉ MODO CORRE — pura: ni red, ni entorno, ni proceso.
 *
 *   · demo-* SIN emulador → se niega (un demo-* no puede llegar a nada real; sin emulador no hay dónde escribir).
 *   · proyecto real CON emulador → se niega (no se mezclan: o una cosa o la otra).
 *   · proyecto real: dry-run por defecto; escribir exige --ejecutar Y --confirmo-autorizacion. Con --ejecutar a
 *     solas se niega (no se degrada en silencio a dry-run: quien lo pidió tiene que enterarse).
 *   · demo-* con emulador: --ejecutar basta.
 *   · un identificador que no lo es (p. ej. `--project --ejecutar`) → se niega.
 *
 * @param {{ proyecto?: string, banderas?: Iterable<string>, emulador?: string }} entrada
 * @returns {{ ok: true, proyecto: string, esDemo: boolean, escribir: boolean } | { ok: false, codigo: number, motivo: string }}
 */
export const decidirModo = ({ proyecto, banderas = [], emulador } = {}) => {
  const b = new Set(banderas);
  const negar = (motivo) => ({ ok: false, codigo: CODIGO_NEGADO, motivo });
  if (typeof proyecto !== 'string' || !FORMA_DE_PROYECTO.test(proyecto)) {
    return negar(`«${proyecto}» no es un identificador de proyecto válido.`);
  }
  const esDemo = proyecto.startsWith('demo-');
  const hayEmulador = typeof emulador === 'string' && emulador.trim() !== '';
  if (esDemo && !hayEmulador) {
    return negar(`«${proyecto}» es un proyecto de emulador y no hay emulador (FIRESTORE_EMULATOR_HOST). Usa firebase emulators:exec.`);
  }
  if (!esDemo && hayEmulador) {
    return negar(`Hay un emulador en el entorno y el proyecto «${proyecto}» es real: no se mezclan. Quita uno de los dos.`);
  }
  const ejecutar = b.has('--ejecutar');
  if (esDemo) return { ok: true, proyecto, esDemo, escribir: ejecutar };
  const confirmado = b.has('--confirmo-autorizacion');
  if (ejecutar && !confirmado) {
    return negar('Para escribir en un proyecto real hacen falta LAS DOS banderas: --ejecutar --confirmo-autorizacion. Sin ellas, dry-run.');
  }
  return { ok: true, proyecto, esDemo, escribir: ejecutar && confirmado };
};

/**
 * QUÉ SE CREA, QUÉ YA ESTÁ Y QUÉ ESTÁ OCUPADO — pura.
 *
 * @param {{ slug: string }[]} oficiales  las de `constants/comunidadesOficiales.ts`
 * @param {Map<string, { porSlug?: { id: string, slug?: unknown, isOfficial?: unknown }[], porId?: { id: string, slug?: unknown, isOfficial?: unknown } | null }>} estado
 *        por slug: las comunidades guardadas con ese slug, y el documento `communities/<slug>` si existe
 * @returns {{ crear: object[], estan: { slug: string, id: string }[], conflictos: { slug: string, id: string, motivo: 'slug' | 'id' }[] }}
 */
export const clasificar = (oficiales, estado) => {
  const crear = [];
  const estan = [];
  const conflictos = [];
  for (const c of oficiales) {
    const { porSlug = [], porId = null } = estado.get(c.slug) || {};
    const ajenas = porSlug.filter((d) => d.isOfficial !== true);
    const suyas = porSlug.filter((d) => d.isOfficial === true);
    const idAjeno = Boolean(porId) && !(porId.isOfficial === true && porId.slug === c.slug);
    for (const d of ajenas) conflictos.push({ slug: c.slug, id: d.id, motivo: 'slug' });
    if (idAjeno && !ajenas.some((d) => d.id === porId.id)) conflictos.push({ slug: c.slug, id: porId.id, motivo: 'id' });
    if (ajenas.length > 0 || idAjeno) continue;
    if (suyas.length > 0) estan.push({ slug: c.slug, id: suyas[0].id });
    else crear.push(c);
  }
  return { crear, estan, conflictos };
};

/* Los datos, del módulo de la app, sin empaquetador. */
export const cargarOficiales = async () => {
  const require = createRequire(path.join(RAIZ, 'functions/package.json'));
  const ts = require('typescript');
  const transpilar = (rel, sustituir = {}) => {
    let js = ts.transpileModule(fs.readFileSync(path.join(RAIZ, rel), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    for (const [a, b] of Object.entries(sustituir)) js = js.split(a).join(b);
    return 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
  };
  const categorias = transpilar('constants/communityCategories.ts');
  const { OFFICIAL_COMMUNITIES } = await import(transpilar('constants/comunidadesOficiales.ts', { "'./communityCategories'": `'${categorias}'` }));
  return OFFICIAL_COMMUNITIES;
};

const resumen = (d) => ({ id: d.id, slug: d.get('slug'), isOfficial: d.get('isOfficial') });

/* Lo que hay guardado en el sitio de cada oficial: por slug y por id. `leer` es `ref.get()` o `t.get(ref)`. */
const leerEstado = async (db, oficiales, leer) => {
  const estado = new Map();
  for (const c of oficiales) {
    const porSlug = await leer(db.collection('communities').where('slug', '==', c.slug));
    const porId = await leer(db.collection('communities').doc(c.slug));
    estado.set(c.slug, { porSlug: porSlug.docs.map(resumen), porId: porId.exists ? resumen(porId) : null });
  }
  return estado;
};

const informar = (oficiales, plan) => {
  for (const e of plan.estan) console.log(`  = ${e.slug.padEnd(26)} ya existe, oficial (${e.id}): no se toca`);
  for (const c of plan.crear) console.log(`  + ${c.slug.padEnd(26)} se crea como communities/${c.slug}`);
  for (const k of plan.conflictos) {
    console.error(k.motivo === 'slug'
      ? `  ✘ CONFLICTO ${k.slug}: communities/${k.id} NO es oficial y tiene el slug de la oficial`
      : `  ✘ CONFLICTO ${k.slug}: el documento communities/${k.id} ya existe y no es esta oficial`);
  }
  console.log(`\n${oficiales.length} oficiales · ${plan.estan.length} ya están · ${plan.crear.length} por crear · ${plan.conflictos.length} conflicto(s)`);
};

const avisarConflictos = (escribiendo) => {
  console.error(`\n✘ CONFLICTO: el sitio de una oficial lo ocupa una comunidad que no es la oficial. ${escribiendo ? 'No se ha escrito NADA' : 'Con --ejecutar no se escribiría NADA'}.`);
  console.error('  El script no se apropia de ella, no la sobrescribe ni la borra: decidir qué se hace con la comunidad de una persona es de una persona.');
};

export const principal = async (argv = process.argv, env = process.env) => {
  const argumentos = argv.slice(2);
  const valor = (b) => { const i = argumentos.indexOf(b); return i >= 0 ? argumentos[i + 1] : undefined; };
  const modo = decidirModo({
    proyecto: valor('--project') || env.GCLOUD_PROJECT || 'demo-wee',
    banderas: argumentos.filter((a) => a.startsWith('--')),
    emulador: env.FIRESTORE_EMULATOR_HOST,
  });
  if (!modo.ok) {
    console.error(`✘ ${modo.motivo}`);
    return modo.codigo;
  }

  const OFFICIAL_COMMUNITIES = await cargarOficiales();
  const require = createRequire(path.join(RAIZ, 'functions/package.json'));
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ projectId: modo.proyecto });
  const db = admin.firestore();
  const emulador = env.FIRESTORE_EMULATOR_HOST;

  console.log(`\nSIEMBRA DE COMUNIDADES OFICIALES — proyecto ${modo.proyecto}${emulador ? ` (emulador ${emulador})` : ''} — ${modo.escribir ? 'ESCRIBIENDO' : 'DRY-RUN (no escribe)'}\n`);

  if (!modo.escribir) {
    const plan = clasificar(OFFICIAL_COMMUNITIES, await leerEstado(db, OFFICIAL_COMMUNITIES, (ref) => ref.get()));
    informar(OFFICIAL_COMMUNITIES, plan);
    if (plan.conflictos.length > 0) {
      avisarConflictos(false);
      return CODIGO_CONFLICTO;
    }
    console.log(modo.esDemo ? 'DRY-RUN: añade --ejecutar para sembrar el emulador.' : 'DRY-RUN: nada escrito. Para escribir: --ejecutar --confirmo-autorizacion, con autorización explícita.');
    return 0;
  }

  /* Leer, decidir y escribir en UNA transacción: todo o nada, y decidido con lo que hay en el momento de escribir. */
  const plan = await db.runTransaction(async (t) => {
    const p = clasificar(OFFICIAL_COMMUNITIES, await leerEstado(db, OFFICIAL_COMMUNITIES, (ref) => t.get(ref)));
    if (p.conflictos.length > 0) return p;
    for (const c of p.crear) {
      t.create(db.collection('communities').doc(c.slug), {
        ...c,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return p;
  });
  informar(OFFICIAL_COMMUNITIES, plan);
  if (plan.conflictos.length > 0) {
    avisarConflictos(true);
    return CODIGO_CONFLICTO;
  }
  console.log(`creadas: ${plan.crear.length}`);
  return 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(await principal());
}
