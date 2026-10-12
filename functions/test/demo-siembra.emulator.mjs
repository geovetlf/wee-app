/**
 * EL MODO DEMO SE SIEMBRA, NO SE DUPLICA Y SE RETIRA SIN TOCAR NADA AJENO — contra el emulador de Firestore.
 *
 *   firebase emulators:exec --only firestore --project demo-wee-design "node functions/test/demo-siembra.emulator.mjs"
 *
 *   1 · --retirar deja el punto de partida sin nada demo; el ensayo no escribe.
 *   2 · --ejecutar siembra los documentos de scripts/demo/datos.mjs, todos con la marca.
 *   3 · Una segunda siembra deja EXACTAMENTE los mismos documentos (mismos ids, mismos recuentos).
 *   4 · Un documento sin marca —aunque su id empiece por demo_— y uno real sobreviven a --retirar, que deja cero demo.
 *   5 · Un id demo ocupado por algo sin la marca detiene la siembra (código 3) sin escribir nada.
 *
 * No sube medios a ningún sitio: crea una carpeta temporal con archivos de nombre igual a los generados (el sembrador
 * solo comprueba que existen) y usa una base de medios local. No vacía el emulador: solo toca lo demo y sus controles.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const app = admin.initializeApp({ projectId: PROY }, 'demo-siembra-prueba');
const db = app.firestore();
const datos = await import(pathToFileURL(path.join(raiz, 'scripts/demo/datos.mjs')).href);

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const medios = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-demo-siembra-'));
for (const f of [...datos.PUBLICACIONES.map((p) => p.imagen).filter(Boolean), ...datos.WEELS.map((w) => w.archivo)]) {
  fs.writeFileSync(path.join(medios, f), 'x');
}
const entorno = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'GOOGLE_APPLICATION_CREDENTIALS'));
const sembrar = (...extra) => spawnSync(process.execPath, [path.join(raiz, 'scripts/sembrar-demo.mjs'), '--project', PROY, ...extra],
  { cwd: raiz, encoding: 'utf8', env: entorno, timeout: 180000 });
const conMedios = ['--medios', medios, '--base-medios', 'http://127.0.0.1:8096/demo'];
const ultimas = (r) => `${r.status} · ${(r.stdout + r.stderr).trim().split('\n').slice(-2).join(' ')}`;

const marcados = async () => {
  const lista = [];
  for (const c of datos.COLECCIONES_DEMO) {
    const s = await db.collection(c).where('procedenciaDemo', '==', datos.PROCEDENCIA_DEMO).get();
    s.docs.forEach((d) => lista.push(`${c}/${d.id}`));
  }
  return lista.sort();
};
const esperados = datos.recontar(datos.construirDocumentos({ ahoraMs: Date.now(), baseMedios: 'http://127.0.0.1:8096/demo', mediosDisponibles: fs.readdirSync(medios) }).documentos);

try {
  const limpio = sembrar('--retirar');
  check('1) --retirar deja el punto de partida sin nada demo', limpio.status === 0 && (await marcados()).length === 0, ultimas(limpio));
  const ensayo = sembrar(...conMedios);
  check('2) el ensayo no escribe nada', ensayo.status === 0 && /ENSAYO/.test(ensayo.stdout) && (await marcados()).length === 0, ultimas(ensayo));

  const primera = sembrar(...conMedios, '--ejecutar');
  const tras1 = await marcados();
  check('3) --ejecutar siembra todos los documentos, con la marca', primera.status === 0 && tras1.length === esperados.total, `${tras1.length}/${esperados.total} · ${ultimas(primera)}`);
  const weels = await db.collection('posts').where('isWeel', '==', true).where('procedenciaDemo', '==', datos.PROCEDENCIA_DEMO).get();
  check('4) los Weëls quedan con vídeo de la base local y medioDemo', weels.size === esperados.weels
    && weels.docs.every((d) => d.get('videoUrl').startsWith('http://127.0.0.1:8096/demo/') && d.get('medioDemo.servidor') === 'desarrollo' && d.get('isPrivate') === false));
  const creador = await db.collection('users').doc('demo_creador_01').get();
  check('5) el perfil demo se encuentra por su uid, como lo busca la app', creador.exists
    && (await db.collection('users').where('uid', '==', 'demo_creador_01').get()).size === 1);

  const segunda = sembrar(...conMedios, '--ejecutar');
  const tras2 = await marcados();
  check('6) una segunda siembra no duplica: mismos ids y mismos recuentos', segunda.status === 0 && JSON.stringify(tras2) === JSON.stringify(tras1), ultimas(segunda));

  await db.collection('posts').doc('demo_control_sin_marca').set({ userId: 'alguien', content: 'id demo_, sin marca', isPrivate: false });
  await db.collection('posts').doc('control_real').set({ userId: 'alguien', content: 'real', isPrivate: false });
  const retirada = sembrar('--retirar');
  check('7) --retirar deja cero documentos demo', retirada.status === 0 && (await marcados()).length === 0, ultimas(retirada));
  check('8) CONTROL: el documento sin marca (con id demo_) y el real sobreviven',
    (await db.collection('posts').doc('demo_control_sin_marca').get()).exists && (await db.collection('posts').doc('control_real').get()).exists);

  await db.collection('posts').doc('demo_post_05').set({ userId: 'alguien', content: 'ocupa un id demo sin la marca', isPrivate: false });
  const conflicto = sembrar(...conMedios, '--ejecutar');
  check('9) un id demo ocupado sin la marca detiene la siembra con código 3 y no escribe nada',
    conflicto.status === 3 && (await marcados()).length === 0 && (await db.collection('posts').doc('demo_post_05').get()).get('content') === 'ocupa un id demo sin la marca', ultimas(conflicto));
} finally {
  for (const id of ['demo_control_sin_marca', 'control_real', 'demo_post_05']) await db.collection('posts').doc(id).delete().catch(() => {});
  fs.rmSync(medios, { recursive: true, force: true });
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
