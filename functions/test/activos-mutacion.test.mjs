/*
 * H5/H2 · PRUEBAS DE MUTACIÓN DEL ÍNDICE Y DEL CERROJO.
 *
 * Cada mutación quita una de las garantías del diseño en una COPIA TEMPORAL del compilado (`functions/lib` copiado a la
 * carpeta temporal del sistema; el repositorio no se toca) y corre contra esa copia las suites deterministas
 * (`activos-indice`, `activos-caminos`, `activos-barrido`, que aceptan `WEE_LIB_ACTIVOS`). Una mutación tiene que hacer
 * FALLAR al menos una: si sobrevive, la prueba es insuficiente y esto falla.
 *
 * Y si el texto que una mutación busca ya no está en el compilado (alguien cambió el código), también falla: una
 * mutación que no muta no prueba nada.
 *
 * Necesita `functions/lib` recién compilado: `npm run build` antes.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FUNCIONES = path.resolve(here, '..');
const LIB = path.join(FUNCIONES, 'lib');
const MODULOS = fs.realpathSync(path.join(FUNCIONES, 'node_modules'));

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};

/*
 * LAS MUTACIONES. `cambios`: [archivo dentro de lib, texto exacto, sustituto, cuántas veces tiene que aparecer].
 * Las cinco que pide el encargo van primero (M1–M5); las demás, por las otras garantías.
 */
const MUTACIONES = [
  {
    id: 'M1', que: 'anotarVariante sin transacción (lee y escribe la ficha fuera de ella; flag cerrada)', suites: ['activos-caminos'],
    cambios: [
      ['content/index.js', 'const snap = await tx.get(ref);', 'const snap = await ref.get();', 1],
      ['content/index.js', 'tx.set(ref, { variants, updatedAt: ahora() }, { merge: true });', 'await ref.set({ variants, updatedAt: ahora() }, { merge: true });', 1],
    ],
  },
  {
    id: 'M2', que: 'la versión no comprueba el estado de la anterior', suites: ['activos-caminos'],
    cambios: [['content/indice.js', "if (ant.status !== 'ready')", 'if (false)', 1]],
  },
  {
    id: 'M3', que: 'la retirada borra sin la precondición de generación', suites: ['activos-caminos'],
    cambios: [['content/indice.js', 'd = await puerto.borrar(r.ref, { generacion: r.generacion });', 'd = await puerto.borrar(r.ref);', 1]],
  },
  {
    id: 'M4', que: 'sin la comprobación de cobertura (ni en la decisión ni en la transición)', suites: ['activos-caminos', 'activos-indice'],
    cambios: [
      ['core/media/indice.js', "return proteger('cobertura_incompleta');", 'void 0;', 1],
      ['core/media/indice.js', "return { ok: false, fallo: 'cobertura_incompleta' };", 'void 0;', 1],
    ],
  },
  {
    id: 'M5', que: 'cerrar sin exigir la concesión propia', suites: ['activos-indice', 'activos-barrido'],
    cambios: [['core/media/indice.js', "if (!o.concesion || typeof hechos.concesionId !== 'string' || o.concesion.id !== hechos.concesionId)\n        return { ok: false, fallo: 'concesion_ajena' };\n    return exito(o, { estado: 'borrado', deletedAt: at }", "return exito(o, { estado: 'borrado', deletedAt: at }", 1]],
  },
  {
    id: 'M6', que: 'la versión lee la anterior FUERA de su transacción (H2, ventana a)', suites: ['activos-caminos'],
    cambios: [['content/indice.js', 'const anterior = await tx.get(fichas.doc(anteriorId));', 'const anterior = await fichas.doc(anteriorId).get();', 1]],
  },
  {
    id: 'M7', que: 'el barrido borra sin la precondición de generación', suites: ['activos-barrido'],
    cambios: [['media/recoleccion.js', '{ generacion: reclamacion.generacion }', 'undefined', 1]],
  },
  {
    id: 'M8', que: 'la reclamación no mira las filas vivas dentro de su transacción', suites: ['activos-barrido'],
    cambios: [['content/indice.js', 'filasVivas: vivas.size', 'filasVivas: 0', 2]],
  },
  {
    id: 'M9', que: 'se admite una fila viva sobre un objeto que se va (borrando/borrado)', suites: ['activos-caminos', 'activos-indice'],
    cambios: [['core/media/indice.js', "    return 'no';\n};", "    return 'directo';\n};", 1]],
  },
  {
    id: 'M10', que: 'consumidores desconocidos tratados como «sin usos» (rompe D-G)', suites: ['activos-caminos', 'activos-barrido'],
    cambios: [['core/media/indice.js', "return proteger('consumidores_no_verificados');", 'void 0;', 1]],
  },
  {
    id: 'M11', que: 'la flag, abierta para todos (la retirada ignora la flag)', suites: ['activos-caminos'],
    cambios: [['content/index.js', 'if ((0, core_1.flagAbiertaPara)((await (0, indice_1.leerFlagDelAlmacen)(db())).config, accountId)) {', 'if (true) {', 1]],
  },
  {
    id: 'M12', que: 'cualquier fallo de metadata se toma por «no existe» (el defecto de versiones.ts)', suites: ['activos-caminos'],
    cambios: [['content/versiones.js', "return (0, indice_1.esObjetoAusente)(error) ? { status: 'archivo_ajeno' } : { status: 'no_creada' };", "return { status: 'archivo_ajeno' };", 2]],
  },
  {
    id: 'M13', que: 'la retirada lee la ficha FUERA de su transacción (T1, experimento A5)', suites: ['activos-caminos'],
    cambios: [['content/indice.js', "    const t1 = await db.runTransaction(async (tx) => {\n        var _a, _b;\n        const at = deps.ahora();\n        const snap = await tx.get(fichaRef);", "    const t1 = await db.runTransaction(async (tx) => {\n        var _a, _b;\n        const at = deps.ahora();\n        const snap = await fichaRef.get();", 1]],
  },
  /* Las dos correcciones de la integración (trk-s): B1, el cubo; B2, las marcas de subida en transacción. */
  {
    id: 'M14', que: 'B2 · marcarMaterialSubido lee la ficha FUERA de su transacción (vuelve a resucitar un retirado)', suites: ['activos-caminos'],
    cambios: [['content/index.js', 'const vista = await tx.get(fichaQueSube);', 'const vista = await fichaQueSube.get();', 1]],
  },
  {
    id: 'M15', que: 'B2 · marcarMaterialFallido lee la ficha FUERA de su transacción', suites: ['activos-caminos'],
    cambios: [['content/index.js', 'const leida = await tx.get(fichaQueFalla);', 'const leida = await fichaQueFalla.get();', 1]],
  },
  /*
   * M16 y M17 se reapuntaron el 10 de octubre (A-2). Sus objetivos anteriores, el borrado por clave del camino de siempre y
   * la revisión por clave de ese mismo camino, dejaron de existir como efecto observable al no borrarse nada con la
   * bandera cerrada (C-1): el mutante era equivalente y no podía morir. Ahora atacan la ruta con índice, donde sí hay
   * regresiones reales. Pruebas: `activos-dos-cuentas.test.mjs`.
   */
  {
    id: 'M16', que: 'A-2 · la retirada con índice ignora las fichas vivas de OTRAS cuentas sobre la clave', suites: ['activos-dos-cuentas'],
    cambios: [['content/indice.js', '(d) => d.id !== assetId', '(d) => d.id !== assetId && d.data().ownerAccountId === cuenta', 1]],
  },
  {
    id: 'M17', que: 'A-2 · la revisión de marcas tras un borrado toca las marcas pendientes de OTRAS cuentas', suites: ['activos-dos-cuentas'],
    cambios: [['content/indice.js', 'if (!d || d.ownerAccountId !== cuenta || d.status !== \'deleted\' || d.pendingPhysicalDeletion !== true)', 'if (!d || d.status !== \'deleted\' || d.pendingPhysicalDeletion !== true)', 1]],
  },
  {
    id: 'M20', que: 'A-2 · el borrado MC-5 no cuenta las fichas vivas por clave (solo las filas)', suites: ['activos-dos-cuentas'],
    cambios: [['content/indice.js', 'filasVivas: vivas.size + fichasVivas', 'filasVivas: vivas.size', 1]],
  },
  {
    id: 'M21', que: 'A-2 · la reconciliación no cuenta el uso ajeno (filas o fichas vivas de otra cuenta)', suites: ['activos-dos-cuentas'],
    cambios: [['core/media/reconciliacion.js', 'const usoAjeno = ajenas.some((f) => f.viva) || (typeof o.referenciasAjenas === \'number\' && o.referenciasAjenas > 0);', 'const usoAjeno = false;', 1]],
  },
  {
    id: 'M22', que: 'A-2 · un recuento ajeno desconocido se trata como ausencia de uso (objeto huérfano)', suites: ['activos-dos-cuentas'],
    cambios: [['core/media/reconciliacion.js', '!usoAjeno && typeof o.referenciasAjenas === \'number\'', '!usoAjeno', 1]],
  },
  /* Los dos hallazgos de la verificación del punto C: «una referencia desconocida se trata como protegida». */
  {
    id: 'M18', que: 'C · un registro de consumidores vacío vuelve a decir «sin_usos» por vacío', suites: ['activos-indice'],
    cambios: [['core/media/indice.js', "    if (!Array.isArray(registro) || registro.length === 0)\n        return { estado: 'desconocido', tipos: Object.freeze([]) };\n", '', 1]],
  },
  {
    id: 'M19', que: 'C · un uso dicho por un tipo que el registro no conoce se vuelve a ignorar', suites: ['activos-indice'],
    cambios: [['core/media/indice.js', "    for (const r of lista)\n        if (r && r.estado === 'con_usos' && !registro.some((c) => c && c.tipo === r.tipo))\n            conUsos.push(String(r.tipo));\n", '', 1]],
  },
];

const copia = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-activos-mutantes-'));
const LIB_COPIA = path.join(copia, 'lib');
const correr = (suite) => spawnSync(process.execPath, [path.join(here, `${suite}.test.mjs`)], {
  env: { ...process.env, WEE_LIB_ACTIVOS: LIB_COPIA, NODE_PATH: MODULOS },
  encoding: 'utf8',
  timeout: 180_000,
});
const primerFallo = (salida) => (String(salida).split('\n').find((l) => /^✘ \d+\)/.test(l)) ?? '').slice(0, 160);

try {
  fs.cpSync(LIB, LIB_COPIA, { recursive: true });

  /* La copia sin mutar tiene que pasar entera: si no, lo que falle no lo habría matado ninguna mutación. */
  console.log('\n── La copia, sin mutar ──');
  for (const suite of ['activos-indice', 'activos-caminos', 'activos-barrido', 'activos-dos-cuentas']) {
    const r = correr(suite);
    check(`la copia sin mutar pasa ${suite}`, r.status === 0, r.status === 0 ? '' : primerFallo(r.stdout) || String(r.stderr).slice(0, 200));
  }

  console.log('\n── Cada mutación tiene que morir ──');
  for (const m of MUTACIONES) {
    const originales = new Map();
    let aplicada = true;
    let detalle = '';
    try {
      for (const [archivo, buscar, poner, veces] of m.cambios) {
        const ruta = path.join(LIB_COPIA, archivo);
        const src = originales.get(ruta) ?? fs.readFileSync(ruta, 'utf8');
        if (!originales.has(ruta)) originales.set(ruta, src);
        const actual = fs.readFileSync(ruta, 'utf8');
        const vistas = actual.split(buscar).length - 1;
        if (vistas !== veces) { aplicada = false; detalle = `${archivo}: el texto aparece ${vistas} veces y se esperaban ${veces}`; break; }
        fs.writeFileSync(ruta, actual.split(buscar).join(poner));
      }
      let asesina = '';
      if (aplicada) {
        for (const suite of m.suites) {
          const r = correr(suite);
          if (r.status !== 0) { asesina = `${suite}: ${primerFallo(r.stdout) || String(r.stderr).split('\n')[0]}`; break; }
        }
      }
      check(`${m.id} muere — ${m.que}`, aplicada && !!asesina, aplicada ? (asesina || 'SOBREVIVE: falta una prueba') : `NO APLICADA: ${detalle}`);
    } finally {
      for (const [ruta, src] of originales) fs.writeFileSync(ruta, src);
    }
  }
  check('al menos cinco mutaciones, como pide el encargo', MUTACIONES.length >= 5);
} finally {
  fs.rmSync(copia, { recursive: true, force: true });
}

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`);
process.exit(fallos ? 1 : 0);
