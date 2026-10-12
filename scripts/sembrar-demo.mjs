/*
 * SEMBRAR EL MODO DEMO — solo en los EMULADORES locales (proyecto demo-*). docs/WEE-DEMO.md.
 *
 * Escribe con el SDK de administración los creadores, publicaciones, Weëls, comentarios, likes, acuerdos y
 * seguimientos de `scripts/demo/datos.mjs`. NO sube bytes a ningún sitio: los medios ya están generados en una carpeta
 * local y los sirve un servidor de desarrollo de solo lectura que monta quien siembra; las publicaciones guardan su URL
 * (`--base-medios`) y `medioDemo: { archivo, origen: 'generado-local', servidor: 'desarrollo' }`. No es el motor de
 * almacenamiento de Weë y no consolida ningún proveedor.
 *
 * Uso (con los emuladores ya arrancados):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/sembrar-demo.mjs --project demo-wee-design \
 *       --medios <carpeta de medios> --base-medios http://192.168.0.39:8096/demo            → ENSAYO (no escribe)
 *   … lo mismo + --ejecutar                                                                 → siembra
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/sembrar-demo.mjs --project demo-wee-design --retirar
 *                                                                                           → borra lo demo
 *   … --retirar --ensayo                                                                    → enseña qué borraría
 *
 * Guardas, todas ANTES de abrir ninguna conexión: el proyecto tiene que ser demo-*; FIRESTORE_EMULATOR_HOST tiene que
 * estar definida; no puede haber credenciales de servicio (GOOGLE_APPLICATION_CREDENTIALS); y para sembrar,
 * --base-medios tiene que ser http(s) a localhost o a una IP privada, y --medios una carpeta que exista.
 *
 * IDEMPOTENTE: ids fijos y `set` completo. Si un id demo está ocupado por un documento SIN la marca, se detiene sin
 * escribir nada (código 3). `--retirar` solo borra documentos con `procedenciaDemo: 'wee-demo-r9'`; los archivos
 * locales no se tocan.
 *
 * Códigos: 0 bien · 2 modo no seguro (no se conecta a nada) · 3 conflicto (no se escribe nada).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  COLECCIONES_DEMO, PROCEDENCIA_DEMO, construirDocumentos, recontar, seleccionarParaRetirar, conflictosDeSiembra,
  validarBaseMedios,
} from './demo/datos.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CODIGO_NEGADO = 2;
export const CODIGO_CONFLICTO = 3;

/**
 * EL MODO — pura: ni red, ni proceso. Decide si se puede seguir y qué se hace.
 * @returns {{ ok: true, proyecto: string, accion: 'ensayo' | 'sembrar' | 'retirar' | 'ensayo-retirar', baseMedios?: string, medios?: string }
 *          | { ok: false, codigo: number, motivo: string }}
 */
export const decidirModo = ({ argv = [], env = {} } = {}) => {
  const negar = (motivo) => ({ ok: false, codigo: CODIGO_NEGADO, motivo });
  const valor = (b) => { const i = argv.indexOf(b); return i >= 0 ? argv[i + 1] : undefined; };
  const banderas = new Set(argv.filter((a) => a.startsWith('--')));
  const proyecto = valor('--project') || env.GCLOUD_PROJECT || 'demo-wee-design';
  if (typeof proyecto !== 'string' || !proyecto.startsWith('demo-')) {
    return negar(`«${proyecto}» no es un proyecto demo-*: el modo demo solo escribe en los emuladores.`);
  }
  if (!env.FIRESTORE_EMULATOR_HOST || !String(env.FIRESTORE_EMULATOR_HOST).trim()) {
    return negar('Falta FIRESTORE_EMULATOR_HOST: sin emulador no hay dónde sembrar (y nunca se siembra un proyecto real).');
  }
  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    return negar('Hay credenciales de servicio en el entorno (GOOGLE_APPLICATION_CREDENTIALS): quítalas, el modo demo no las necesita.');
  }
  if (banderas.has('--retirar')) {
    if (banderas.has('--ejecutar')) return negar('--retirar y --ejecutar no van juntos: elige uno.');
    return { ok: true, proyecto, accion: banderas.has('--ensayo') ? 'ensayo-retirar' : 'retirar' };
  }
  const base = validarBaseMedios(valor('--base-medios'));
  if (!base.ok) return negar(base.motivo);
  const medios = valor('--medios');
  if (!medios || !fs.existsSync(medios) || !fs.statSync(medios).isDirectory()) {
    return negar(`--medios tiene que ser la carpeta de los medios generados (llegó «${medios ?? ''}»).`);
  }
  if (banderas.has('--ejecutar') && banderas.has('--ensayo')) return negar('--ensayo y --ejecutar no van juntos.');
  return { ok: true, proyecto, accion: banderas.has('--ejecutar') ? 'sembrar' : 'ensayo', baseMedios: base.base, medios };
};

const imprimirRecuentos = (r) => {
  console.log(`  creadores ${r.creadores} · publicaciones ${r.publicaciones} (encuestas ${r.encuestas}) · Weëls ${r.weels}`);
  console.log(`  comentarios ${r.comentarios} · likes ${r.likes} · acuerdos ${r.acuerdos} · seguimientos ${r.seguimientos} · total ${r.total} documentos`);
};

/* Lo demo que hay guardado (con la marca), en las colecciones del modo demo. */
const leerMarcados = async (db) => {
  const encontrados = [];
  for (const coleccion of COLECCIONES_DEMO) {
    const snap = await db.collection(coleccion).where('procedenciaDemo', '==', PROCEDENCIA_DEMO).get();
    for (const d of snap.docs) encontrados.push({ coleccion, id: d.id, datos: d.data() });
  }
  return encontrados;
};

const borrar = async (db, docs) => {
  for (let i = 0; i < docs.length; i += 400) {
    const lote = db.batch();
    for (const d of docs.slice(i, i + 400)) lote.delete(db.collection(d.coleccion).doc(d.id));
    await lote.commit();
  }
};

export const principal = async (argv = process.argv.slice(2), env = process.env) => {
  const modo = decidirModo({ argv, env });
  if (!modo.ok) {
    console.error(`✘ ${modo.motivo}`);
    return modo.codigo;
  }

  const require = createRequire(path.join(RAIZ, 'functions/package.json'));
  const admin = require('firebase-admin');
  const app = admin.apps.find((a) => a && a.name === 'wee-demo') || admin.initializeApp({ projectId: modo.proyecto }, 'wee-demo');
  const db = app.firestore();
  console.log(`\nMODO DEMO — proyecto ${modo.proyecto} (emulador ${env.FIRESTORE_EMULATOR_HOST}) — ${modo.accion.toUpperCase()}\n`);

  if (modo.accion === 'retirar' || modo.accion === 'ensayo-retirar') {
    const elegidos = seleccionarParaRetirar(await leerMarcados(db));
    const porColeccion = Object.fromEntries(COLECCIONES_DEMO.map((c) => [c, elegidos.filter((d) => d.coleccion === c).length]));
    console.log(`  con la marca ${PROCEDENCIA_DEMO}: ${JSON.stringify(porColeccion)} · total ${elegidos.length}`);
    if (modo.accion === 'ensayo-retirar') {
      console.log('ENSAYO: nada borrado. Quita --ensayo para retirar.');
      return 0;
    }
    await borrar(db, elegidos);
    console.log(`retirados: ${elegidos.length}`);
    return 0;
  }

  const archivos = fs.readdirSync(modo.medios).filter((f) => /\.(webm|png)$/i.test(f));
  const { documentos, omitidos } = construirDocumentos({
    ahoraMs: Date.now(),
    baseMedios: modo.baseMedios,
    mediosDisponibles: archivos,
    sello: (ms) => admin.firestore.Timestamp.fromMillis(ms),
  });
  for (const o of omitidos) console.warn(`  ! falta ${o.archivo}: ${o.id} no se crea`);
  imprimirRecuentos(recontar(documentos));
  console.log(`  medios desde ${modo.baseMedios}/<archivo> (servidor de desarrollo local; no se sube nada)`);

  /* Lo que ya ocupa los ids que se van a escribir: si algo no lleva la marca, no se toca nada. */
  const refs = documentos.map((d) => db.collection(d.coleccion).doc(d.id));
  const existentes = [];
  for (let i = 0; i < refs.length; i += 300) {
    const snaps = await db.getAll(...refs.slice(i, i + 300));
    snaps.forEach((s, k) => existentes.push({ coleccion: documentos[i + k].coleccion, id: s.id, datos: s.exists ? s.data() : null }));
  }
  const conflictos = conflictosDeSiembra(existentes);
  if (conflictos.length > 0) {
    for (const c of conflictos) console.error(`  ✘ CONFLICTO: ${c.coleccion}/${c.id} existe y NO lleva la marca del modo demo`);
    console.error(`\n✘ ${modo.accion === 'sembrar' ? 'No se ha escrito NADA' : 'Con --ejecutar no se escribiría NADA'}: un id demo está ocupado por algo que no es demo.`);
    return CODIGO_CONFLICTO;
  }
  const planeados = new Set(documentos.map((d) => `${d.coleccion}/${d.id}`));
  const sobrantes = seleccionarParaRetirar(await leerMarcados(db)).filter((d) => !planeados.has(`${d.coleccion}/${d.id}`));
  const yaEstaban = existentes.filter((e) => e.datos).length;
  console.log(`  ya estaban ${yaEstaban} · nuevos ${documentos.length - yaEstaban} · demo sobrantes de otra siembra ${sobrantes.length}`);

  if (modo.accion === 'ensayo') {
    console.log('ENSAYO: nada escrito. Añade --ejecutar para sembrar.');
    return 0;
  }
  for (let i = 0; i < documentos.length; i += 400) {
    const lote = db.batch();
    for (const d of documentos.slice(i, i + 400)) lote.set(db.collection(d.coleccion).doc(d.id), d.datos);
    await lote.commit();
  }
  await borrar(db, sobrantes);
  console.log(`sembrados: ${documentos.length} · sobrantes retirados: ${sobrantes.length}`);
  return 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(await principal());
}
