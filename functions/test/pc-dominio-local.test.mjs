/**
 * R9 · LÍNEA A — D-4 (decisión del dueño, 2026-10-12): CREACIONES SOLO LOCALES.
 *
 *   node test/pc-dominio-local.test.mjs      (sin build: transpila los .ts del cliente con los ganchos de local-first)
 *
 * Ejecuta `utils/creacionesLocales.ts` sobre un AlmacenLocal en memoria y el catálogo local REAL de la línea C
 * (`utils/catalogoLocal.ts`): finalizar sin red ni subida, idempotencia, distinguir local de sincronizado,
 * proteger el archivo si no se puede leer, y no tocar nunca el recurso del catálogo. Con CONTROLES.
 */
import { importarFuente, RAIZ } from './_cargador-local-first.mjs';
import fs from 'node:fs';
import path from 'node:path';

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };

/* Un AlmacenLocal en memoria con la forma del puerto (escritura atómica = reemplazo entero). */
const crearAlmacen = () => {
  const m = new Map();
  let escrituras = 0;
  return {
    plataforma: 'web',
    escribir: async (k, d) => { escrituras++; m.set(k, new Uint8Array(d)); },
    leer: async (k) => { if (!m.has(k)) { const e = new Error('no'); e.codigo = 'no_existe'; throw e; } return new Uint8Array(m.get(k)); },
    existe: async (k) => m.has(k),
    borrar: async (k) => { m.delete(k); },
    listar: async (p) => [...m.keys()].filter((k) => k.startsWith(p)).map((clave) => ({ clave, tamano: m.get(clave).length })),
    limpiarTemporales: async () => 0,
    estado: async () => ({ disponible: true }),
    _mapa: m,
    get escrituras() { return escrituras; },
  };
};

const L = await importarFuente('utils/creacionesLocales.ts');
const { abrirCatalogoLocal } = await importarFuente('utils/catalogoLocal.ts');
const almacen = crearAlmacen();
let t = 1_800_000_000_000;
const ahora = () => (t += 1000);
const catalogo = await abrirCatalogoLocal(almacen, { ahora });
const proyecto = await catalogo.crearProyecto({ name: 'Mi receta' });
const recurso = await catalogo.añadirRecurso(proyecto.projectId, { nombre: 'foto.png', tipo: 'imagen', mimeType: 'image/png', datos: new Uint8Array([1, 2, 3, 4]) });
const ref = { projectId: proyecto.projectId, recursoId: recurso.recursoId, sha256: recurso.sha256 };
const indiceAntes = Buffer.from(almacen._mapa.get('indice.json')).toString('utf8');
const C = L.abrirCreacionesLocales(almacen, { ahora, presente: L.recursoLocalPresente(catalogo), cuentaId: 'cuentaAna0001' });

/* Sin red: si algo intentara llamar a fetch, fallaría la prueba. */
const fetchReal = globalThis.fetch;
let llamadasDeRed = 0;
globalThis.fetch = async () => { llamadasDeRed++; throw new Error('sin red'); };

const f1 = await C.finalizar({ referencias: [ref], tipo: 'image', herramienta: 'chef', proyectoOrigenId: proyecto.projectId, nombre: 'Plato', requestId: 'req-local-0001' });
const lista = await C.listar();
check('1) se finaliza un resultado SOLO LOCAL sin conexión ni subida', !f1.yaExistia && lista.length === 1 && llamadasDeRed === 0);
check('1b) queda como local y sin sincronizar, con su referencia (no bytes)', lista[0].ubicacion === 'local' && lista[0].sincronizacion === 'solo_local'
  && JSON.stringify(lista[0].referencias) === JSON.stringify([ref]) && !('datos' in lista[0]) && lista[0].proyectoOrigenId === proyecto.projectId);
check('1c) el catálogo local no se toca (el recurso sigue igual)', Buffer.from(almacen._mapa.get('indice.json')).toString('utf8') === indiceAntes);
const f2 = await C.finalizar({ referencias: [ref, ref], tipo: 'image', requestId: 'req-local-0002' });
check('2) finalizar dos veces lo mismo no duplica', f2.yaExistia && f2.creacionId === f1.creacionId && (await C.listar()).length === 1);
const f3 = await C.finalizar({ referencias: [ref], tipo: 'image', requestId: 'req-local-0001' });
check('2b) repetir el requestId devuelve la misma', f3.yaExistia && f3.creacionId === f1.creacionId);
const ajeno = await intento(() => C.finalizar({ referencias: [{ ...ref, sha256: 'c'.repeat(64) }], tipo: 'image', requestId: 'req-local-0003' }));
check('3) un recurso que no está en el dispositivo (o cambió de huella) no se finaliza', !ajeno.ok && ajeno.error.code === 'no_encontrado');
const choque = await intento(() => C.finalizar({ referencias: [{ ...ref, recursoId: 'otro01' }], tipo: 'image', requestId: 'req-local-0001' }));
check('3b) el mismo requestId para otro conjunto es conflicto', !choque.ok && (choque.error.code === 'conflicto' || choque.error.code === 'no_encontrado'));
const C2 = L.abrirCreacionesLocales(almacen, { ahora });
const choque2 = await intento(() => C2.finalizar({ referencias: [{ ...ref, recursoId: 'otro01' }], tipo: 'image', requestId: 'req-local-0001' }));
check('3c) CONTROL · sin comprobador de presencia, el mismo requestId con otro conjunto es conflicto (la regla es la del servidor)', !choque2.ok && choque2.error.code === 'conflicto');
const [p1, p2] = await Promise.all([
  C.finalizar({ referencias: [ref], tipo: 'image', nombre: 'A', requestId: 'req-local-0004' }),
  C.finalizar({ referencias: [ref], tipo: 'image', nombre: 'B', requestId: 'req-local-0005' }),
]);
check('4) dos finalizar a la vez no se pisan ni duplican', p1.creacionId === p2.creacionId && (await C.listar()).length === 1);
const e1 = await C.eliminar(f1.creacionId);
check('5) eliminar la creación local no toca el recurso del catálogo', !e1.yaEstaba && (await C.listar()).length === 0
  && Buffer.from(almacen._mapa.get('indice.json')).toString('utf8') === indiceAntes);
const rev = await C.finalizar({ referencias: [ref], tipo: 'image', requestId: 'req-local-0006' });
check('5b) volver a finalizarla la revive con el mismo id', !rev.yaExistia && rev.creacionId === f1.creacionId && (await C.listar()).length === 1);

/* Protección: un archivo ilegible o de un esquema más nuevo no se sobrescribe nunca. */
const roto = crearAlmacen();
roto._mapa.set(L.CLAVE_DE_CREACIONES_LOCALES, new TextEncoder().encode('{esto no es json'));
const R = L.abrirCreacionesLocales(roto, { ahora });
const r1 = await intento(() => R.finalizar({ referencias: [ref], tipo: 'image', requestId: 'req-local-0007' }));
check('6) archivo ilegible: se informa y NO se sobrescribe (se protege lo local)', !r1.ok && r1.error.code === 'ilegible'
  && new TextDecoder().decode(roto._mapa.get(L.CLAVE_DE_CREACIONES_LOCALES)) === '{esto no es json' && roto.escrituras === 0);
const nuevo = crearAlmacen();
nuevo._mapa.set(L.CLAVE_DE_CREACIONES_LOCALES, new TextEncoder().encode(JSON.stringify({ esquema: 99, creaciones: [] })));
const r2 = await intento(() => L.abrirCreacionesLocales(nuevo, { ahora }).finalizar({ referencias: [ref], tipo: 'image', requestId: 'req-local-0008' }));
check('6b) esquema más nuevo: solo lectura, sin tocar nada', !r2.ok && r2.error.code === 'solo_lectura' && nuevo.escrituras === 0);

/* Contrato: la forma común para pintarla junto a las de Weë Cloud. */
const contrato = fs.readFileSync(path.join(RAIZ, 'services/cicloDeTrabajo.ts'), 'utf8');
check('7) el contrato expone lo local y su forma común (ubicacion local + referencias + sincronización)',
  /export \{ abrirCreacionesLocales, recursoLocalPresente, ErrorDeCreacionLocal \}/.test(contrato) && /export const creacionLocalComoFinal/.test(contrato)
  && /ubicacion: 'local',\s*referenciasLocales: c\.referencias,\s*sincronizacion: c\.sincronizacion/.test(contrato));
check('7b) y lo local no llama al servidor ni sube bytes', !/httpsCallable|firebase|fetch\(/.test(fs.readFileSync(path.join(RAIZ, 'utils/creacionesLocales.ts'), 'utf8')) && llamadasDeRed === 0);

globalThis.fetch = fetchReal;
console.log(failures === 0 ? '\nOK pc-dominio-local' : `\n${failures} fallo(s) en pc-dominio-local`);
process.exit(failures === 0 ? 0 : 1);
