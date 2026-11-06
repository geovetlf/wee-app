/*
 * REINICIAR EL MODO DEMO — solo en los EMULADORES locales (proyecto demo-*). docs/WEE-DEMO.md.
 *
 * Vacía el emulador de Firestore y el de Auth de ESE proyecto y vuelve a sembrar lo mismo, así que cada grabación
 * empieza igual. Vaciar va por la API `/emulator/v1/...`, que solo existe en un emulador: no hay orden de borrado que
 * pueda llegar a datos reales.
 *
 * Uso (con los emuladores y el servidor de medios arrancados):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *     node scripts/sembrar-demo.mjs --project demo-wee-migracion --medios <carpeta> --base-medios http://192.168.0.39:8096  → ENSAYO
 *   … lo mismo + --ejecutar                                                                                         → reinicia
 *   … --retirar                                                                                                     → vacía sin sembrar
 *
 * Códigos: 0 bien · 2 modo no seguro (no se conecta a nada).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ESPECTADOR, construirDocumentos, recontar, validarBaseMedios } from './demo/datos.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CODIGO_NEGADO = 2;
const LOCAL = /^(127\.\d+\.\d+\.\d+|localhost|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/;

/**
 * EL MODO — pura: ni red, ni proceso. Decide si se puede seguir y qué se hace.
 * @returns {{ ok: true, proyecto: string, accion: 'ensayo' | 'reiniciar' | 'retirar', baseMedios?: string, medios?: string }
 *          | { ok: false, codigo: number, motivo: string }}
 */
export const decidirModo = ({ argv = [], env = {} } = {}) => {
  const negar = (motivo) => ({ ok: false, codigo: CODIGO_NEGADO, motivo });
  const valor = (b) => { const i = argv.indexOf(b); return i >= 0 ? argv[i + 1] : undefined; };
  const banderas = new Set(argv.filter((a) => a.startsWith('--')));
  const proyecto = valor('--project') || 'demo-wee-migracion';
  if (typeof proyecto !== 'string' || !proyecto.startsWith('demo-')) {
    return negar(`«${proyecto}» no es un proyecto demo-*: el modo demo solo escribe en los emuladores.`);
  }
  for (const v of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) {
    if (!env[v] || !LOCAL.test(String(env[v]).trim())) return negar(`Falta ${v} apuntando a un emulador local: nunca se siembra un proyecto real.`);
  }
  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    return negar('Hay credenciales de servicio en el entorno (GOOGLE_APPLICATION_CREDENTIALS): quítalas, el modo demo no las necesita.');
  }
  if (banderas.has('--retirar')) return { ok: true, proyecto, accion: 'retirar' };
  const base = validarBaseMedios(valor('--base-medios'));
  if (!base.ok) return negar(base.motivo);
  const medios = valor('--medios');
  if (!medios || !fs.existsSync(path.join(medios, 'registro.json'))) {
    return negar(`--medios tiene que ser la carpeta con registro.json (llegó «${medios ?? ''}»).`);
  }
  return { ok: true, proyecto, accion: banderas.has('--ejecutar') ? 'reiniciar' : 'ensayo', baseMedios: base.base, medios };
};

const vaciarEmuladores = async (proyecto, env) => {
  const pedir = async (url) => {
    const r = await fetch(url, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
    if (!r.ok) throw new Error(`El emulador contestó ${r.status} a ${url}`);
  };
  await pedir(`http://${env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${proyecto}/databases/(default)/documents`);
  await pedir(`http://${env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${proyecto}/accounts`);
};

export const principal = async (argv = process.argv.slice(2), env = process.env) => {
  const modo = decidirModo({ argv, env });
  if (!modo.ok) {
    console.error(`✘ ${modo.motivo}`);
    return modo.codigo;
  }
  console.log(`\nMODO DEMO — proyecto ${modo.proyecto} (emulador ${env.FIRESTORE_EMULATOR_HOST}) — ${modo.accion.toUpperCase()}\n`);
  if (modo.accion === 'retirar') {
    await vaciarEmuladores(modo.proyecto, env);
    console.log('Emuladores vacíos.');
    return 0;
  }

  const require = createRequire(path.join(RAIZ, 'functions/package.json'));
  const admin = require('firebase-admin');
  const app = admin.apps.find((a) => a && a.name === 'wee-demo') || admin.initializeApp({ projectId: modo.proyecto }, 'wee-demo');
  const registro = JSON.parse(fs.readFileSync(path.join(modo.medios, 'registro.json'), 'utf8'));
  const { documentos, omitidos } = construirDocumentos({
    ahoraMs: Date.now(),
    baseMedios: modo.baseMedios,
    registro,
    sello: (ms) => admin.firestore.Timestamp.fromMillis(ms),
  });
  for (const o of omitidos) console.warn(`  ! falta el medio ${o.medio}: ${o.id} no se crea`);
  console.log(' ', JSON.stringify(recontar(documentos)));
  if (modo.accion === 'ensayo') {
    console.log('ENSAYO: nada escrito. Añade --ejecutar para reiniciar.');
    return 0;
  }

  await vaciarEmuladores(modo.proyecto, env);
  await app.auth().createUser({ uid: ESPECTADOR.uid, email: ESPECTADOR.correo, password: ESPECTADOR.clave, displayName: ESPECTADOR.nombre, emailVerified: true });
  const db = app.firestore();
  for (let i = 0; i < documentos.length; i += 400) {
    const lote = db.batch();
    for (const d of documentos.slice(i, i + 400)) lote.set(db.collection(d.coleccion).doc(d.id), d.datos);
    await lote.commit();
  }
  console.log(`Reiniciado: ${documentos.length} documentos.`);
  return 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(await principal());
}
