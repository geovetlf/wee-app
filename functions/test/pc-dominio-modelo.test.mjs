/**
 * R9 · LÍNEA A — EL MODELO PURO DE «MIS PROYECTOS / MIS CREACIONES», Y SU ESPEJO.
 *
 *   node test/pc-dominio-modelo.test.mjs      (necesita `npm run build`: lee functions/lib)
 *
 * Comprueba `utils/cicloDeTrabajo.ts` (cliente, transpilado aquí) y
 * `functions/src/content/creaciones-modelo.ts` (servidor, compilado en lib)
 * caso a caso: estados, transiciones, idempotencia de finalizar, reabrir,
 * ubicación independiente del estado, publicar sin efectos y la regla
 * conservadora con lo existente. Con CONTROLES: cada propiedad tiene su caso
 * que debe dar lo contrario.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
const ts = require('typescript');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const transpilar = (rel) => {
  const js = ts.transpileModule(leer(rel), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
};
const cliente = await transpilar('utils/cicloDeTrabajo.ts');
const servidor = require(path.resolve(raiz, 'functions/lib/content/creaciones-modelo.js'));

for (const [nombre, M] of [['cliente', cliente], ['servidor', servidor]]) {
  console.log(`\n── ${nombre} ──`);
  /* 1 · estados y transiciones */
  const inicio = { creacion: 'ninguna', proyecto: 'en_proceso' };
  const editado = M.aplicar('editar', inicio);
  check(`${nombre} 1) editar deja el trabajo en proceso y sin creación`, editado.creacion === 'ninguna' && editado.proyecto === 'en_proceso');
  const fin = M.aplicar('finalizar', inicio);
  check(`${nombre} 2) finalizar crea la creación y NO cierra ni borra el proyecto`, fin.creacion === 'final' && fin.proyecto === 'en_proceso');
  check(`${nombre} 2c) CONTROL · finalizar sí cambia la creación (no es un no-op)`, fin.creacion !== inicio.creacion);
  const fin2 = M.aplicar('finalizar', fin);
  check(`${nombre} 3) finalizar dos veces deja exactamente lo mismo`, JSON.stringify(fin2) === JSON.stringify(fin));
  const reab = M.aplicar('reabrir', { creacion: 'final', proyecto: 'archivado' });
  check(`${nombre} 4) reabrir conserva la creación final y saca el proyecto del archivo`, reab.creacion === 'final' && reab.proyecto === 'en_proceso');
  check(`${nombre} 4c) CONTROL · reabrir sin creación no es válido`, !M.transicionValida('reabrir', { creacion: 'ninguna' }));
  const elim = M.aplicar('eliminar_creacion', fin);
  check(`${nombre} 5) eliminar la creación no toca el proyecto`, elim.creacion === 'eliminada' && elim.proyecto === 'en_proceso');
  const borrado = M.aplicar('eliminar_proyecto', fin);
  check(`${nombre} 6) borrar el proyecto no rompe la creación`, borrado.creacion === 'final' && borrado.proyecto === 'eliminado');
  const arch = M.aplicar('archivar_proyecto', fin);
  check(`${nombre} 7) archivar el proyecto no rompe la creación`, arch.creacion === 'final' && arch.proyecto === 'archivado');
  for (const s of [inicio, fin, elim, borrado]) {
    const p = M.aplicar('publicar', s);
    check(`${nombre} 8) publicar no finaliza ni mueve (${s.creacion}/${s.proyecto})`, JSON.stringify(p) === JSON.stringify(s));
  }
  check(`${nombre} 8b) y el modelo lo declara`, M.PUBLICAR_CAMBIA_ESTADO === false);
  check(`${nombre} 8c) CONTROL · una acción inválida devuelve lo que había`, JSON.stringify(M.aplicar('reabrir', inicio)) === JSON.stringify(inicio));

  /* Interpretación de lo existente */
  check(`${nombre} 9) un proyecto de hoy (sin archivedAt) está en proceso`, M.estadoDeProyecto({ name: 'x' }) === 'en_proceso');
  check(`${nombre} 9b) archivedAt null también (desarchivar escribe null)`, M.estadoDeProyecto({ archivedAt: null }) === 'en_proceso');
  check(`${nombre} 9c) CONTROL · con archivedAt está archivado; sin documento, eliminado`, M.estadoDeProyecto({ archivedAt: 1 }) === 'archivado' && M.estadoDeProyecto(null) === 'eliminado');
  check(`${nombre} 10) un asset sin creación queda «sin decidir» (no se infiere final)`, M.interpretarAsset('a1', new Set()) === 'sin_decidir');
  check(`${nombre} 10c) CONTROL · uno dentro de una creación viva sí está en creación`, M.interpretarAsset('a1', new Set(['a1'])) === 'en_creacion');

  /* Ubicación independiente */
  check(`${nombre} 11) ubicación: wee y Media Cloud = Weë Cloud; Cloudinary = remoto legado; sin referencia = local`,
    M.ubicacionDe({ provider: 'wee' }) === 'wee_cloud' && M.ubicacionDe({ provider: 'mediacloud' }) === 'wee_cloud'
    && M.ubicacionDe({ provider: 'cloudinary' }) === 'remoto_legado' && M.ubicacionDe(null) === 'local');

  /* Idempotencia */
  check(`${nombre} 12) el conjunto se normaliza (orden y repetidos)`, JSON.stringify(M.conjuntoDeAssets(['asset_b', 'asset_a', 'asset_b'])) === '["asset_a","asset_b"]');
  check(`${nombre} 12c) CONTROL · vacío, demasiados o mal formados no son un conjunto`,
    M.conjuntoDeAssets([]) === null && M.conjuntoDeAssets(['a/b']) === null && M.conjuntoDeAssets(Array.from({ length: 21 }, (_, i) => `asset_${i}`)) === null);
  const ids = ['asset_a', 'asset_b'];
  check(`${nombre} 13) sin nada guardado se crea`, M.decidirFinalizar({ assetIds: ids, porConjunto: null, porPeticion: null }).accion === 'crear');
  const viva = { creationId: 'c1', assetIds: ids, status: 'final', requestId: 'req-00001' };
  check(`${nombre} 14) mismo conjunto → la misma, sin crear otra`, M.decidirFinalizar({ assetIds: ids, porConjunto: viva, porPeticion: null }).accion === 'devolver');
  check(`${nombre} 15) mismo requestId y mismo conjunto → la misma`, M.decidirFinalizar({ assetIds: ids, porConjunto: viva, porPeticion: viva }).accion === 'devolver');
  check(`${nombre} 16) mismo requestId con OTRO conjunto → conflicto, nunca una segunda`, M.decidirFinalizar({ assetIds: ['asset_z'], porConjunto: null, porPeticion: viva }).accion === 'conflicto');
  check(`${nombre} 17) una eliminada se revive con el mismo id`, M.decidirFinalizar({ assetIds: ids, porConjunto: { ...viva, status: 'eliminada' }, porPeticion: null }).accion === 'revivir');

  /* Reabrir */
  const r1 = M.decidirReabrir({ creationId: 'c1', proyectoOrigenId: 'p1', estadoDelOrigen: 'en_proceso', estadoDelVinculado: 'eliminado' });
  check(`${nombre} 18) reabrir con el origen vivo lo abre, sin crear`, r1.accion === 'abrir' && r1.proyectoId === 'p1' && !r1.desarchivar);
  const r2 = M.decidirReabrir({ creationId: 'c1', proyectoOrigenId: 'p1', estadoDelOrigen: 'eliminado', estadoDelVinculado: 'eliminado' });
  check(`${nombre} 19) sin origen crea uno vinculado con id derivado`, r2.accion === 'crear_vinculado' && r2.proyectoId === 'reab_c1');
  const r3 = M.decidirReabrir({ creationId: 'c1', proyectoOrigenId: 'reab_c1', estadoDelOrigen: 'en_proceso', estadoDelVinculado: 'en_proceso' });
  check(`${nombre} 20) reabrir otra vez reutiliza el vinculado`, r3.accion === 'abrir' && r3.proyectoId === 'reab_c1');
  check(`${nombre} 21) eliminar una creación no retira NINGÚN asset`, M.assetsQueRetiraEliminarCreacion(viva).length === 0);
}

/* Espejo: los dos contestan lo mismo en una tabla de entradas. */
console.log('\n── espejo cliente = servidor ──');
const ACC = ['editar', 'finalizar', 'reabrir', 'eliminar_creacion', 'archivar_proyecto', 'eliminar_proyecto', 'publicar'];
const CRE = ['ninguna', 'final', 'eliminada'];
const PRO = ['en_proceso', 'archivado', 'eliminado'];
let iguales = 0; let total = 0;
for (const a of ACC) for (const c of CRE) for (const p of PRO) {
  total++;
  const x = JSON.stringify([cliente.transicionValida(a, { creacion: c, proyecto: p }), cliente.aplicar(a, { creacion: c, proyecto: p })]);
  const y = JSON.stringify([servidor.transicionValida(a, { creacion: c, proyecto: p }), servidor.aplicar(a, { creacion: c, proyecto: p })]);
  if (x === y) iguales++;
}
check(`22) las ${total} combinaciones acción × creación × proyecto dan lo mismo en los dos`, iguales === total, `${iguales}/${total}`);
const cuerpo = (src) => src.slice(src.indexOf('/* ── Estados'));
check('23) el espejo es literal: el cuerpo del servidor es el del cliente', cuerpo(leer('functions/src/content/creaciones-modelo.ts')).replace(/\r/g, '') === cuerpo(leer('utils/cicloDeTrabajo.ts')).replace(/\r/g, ''));

console.log(failures === 0 ? '\nOK pc-dominio-modelo' : `\n${failures} fallo(s) en pc-dominio-modelo`);
process.exit(failures === 0 ? 0 : 1);
