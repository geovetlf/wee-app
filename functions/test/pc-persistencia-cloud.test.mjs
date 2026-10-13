/**
 * R9 · LÍNEA C (persistencia y coste) · Weë Cloud APAGADO mientras no haya tarifa.
 *
 * Decisión (docs/WEE-ALMACENAMIENTO-Y-COSTE.md): sin una tarifa de almacenamiento fiable
 * NO hay operación comercial de Weë Cloud. Esta suite fija ese estado para que nadie lo
 * cambie sin querer:
 *   W1  el catálogo de Credits no tiene ningún servicio de almacenamiento/nube.
 *   W2  el estimador de coste de medios devuelve `sin_tarifa` y NINGÚN importe sin tarifa.
 *   W3  el cliente no puede cobrar por su cuenta: `spendCredits` exige administración.
 *   W4  ningún proyecto local nace ni se escribe con respaldo en la nube.
 *   W5  ningún módulo del cliente sube un proyecto local a la nube (no hay operación).
 * Con controles: cada detector se prueba contra un caso plantado que debe cazar.
 *
 * El día que exista la tarifa, esta suite DEBE fallar (W1) y obliga a escribir las pruebas
 * del flujo: coste mostrado antes de confirmar, reserva con spendCredits, subida por el
 * Storage Port y completeCredits/refundCredits idempotentes.
 *
 *   node functions/test/pc-persistencia-cloud.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { importarFuente, RAIZ } from './_cargador-local-first.mjs';

let fallos = 0;
const check = (nombre, cond, extra = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const leer = (relativa) => fs.readFileSync(path.join(RAIZ, relativa), 'utf8');

/* W1. Sin servicio de almacenamiento en el catálogo de Credits. */
const fuenteDeCostes = leer('functions/src/credits/creditCosts.ts');
const bloque = fuenteDeCostes.slice(fuenteDeCostes.indexOf('export const CREDIT_COSTS = {'), fuenteDeCostes.indexOf('export type CreditService'));
const servicios = [...bloque.matchAll(/^\s{2}([a-z0-9_]+):\s*\d+/gm)].map((m) => m[1]);
const ES_DE_ALMACEN = /storage|cloud|almacen|backup|respaldo|hosting|bucket|gb_mes|gb_month/i;
check('W1) CONTROL: el lector encuentra los servicios del catálogo', servicios.includes('ai_image') && servicios.length >= 10, `${servicios.length} servicios`);
check('W1) CONTROL: el detector caza un servicio de nube plantado', ES_DE_ALMACEN.test('wee_cloud_storage'));
const deAlmacen = servicios.filter((s) => ES_DE_ALMACEN.test(s));
check('W1) no hay tarifa de almacenamiento en CREDIT_COSTS (Weë Cloud sin precio)', deAlmacen.length === 0, deAlmacen.join(', '));

/* W2. El estimador existente no inventa importes. */
const { estimarCosteDeMedios } = await importarFuente('functions/src/media/optimizador/coste.ts');
const usos = [{ providerId: 'r2', accountId: 'cuenta', metrica: 'bytes_almacenados', cantidad: 1024, occurredAt: 1_700_000_000_000 }];
const sinTarifa = estimarCosteDeMedios({ usos });
check('W2) sin tarifa: estado sin_tarifa', sinTarifa.estado === 'sin_tarifa');
check('W2) sin tarifa: ningún importe ni total (tampoco un cero)', !('total' in sinTarifa) && sinTarifa.lineas.length === 0 && !/amountMinor/.test(JSON.stringify(sinTarifa)));
check('W2) una lista vacía de tarifas es lo mismo que no tenerla', estimarCosteDeMedios({ usos, tarifas: [] }).estado === 'sin_tarifa');

/* W3. El cliente no cobra por su cuenta. */
const indiceCredits = leer('functions/src/credits/index.ts');
const callable = indiceCredits.slice(indiceCredits.indexOf('export const spendCredits'), indiceCredits.indexOf('export const grantCredits'));
check('W3) CONTROL: se localizó el callable spendCredits', callable.includes('creditEngine.spendCredits'));
check('W3) spendCredits exige administración: un cobro de nube tendría que ir en una Function de servidor', /assertAdmin\(/.test(callable));

/* W4. Nada local nace con respaldo en la nube. */
const catalogo = leer('utils/catalogoLocal.ts');
const valores = [...catalogo.matchAll(/respaldo:\s*'([a-z_]+)'/g)].map((m) => m[1]);
check('W4) CONTROL: el lector encuentra las asignaciones de respaldo', valores.length >= 3, `${valores.length}`);
check("W4) todas son 'ninguno'", valores.every((v) => v === 'ninguno'), valores.join(','));
const { abrirCatalogoLocal } = await importarFuente('utils/catalogoLocal.ts');
const { crearAlmacenMemoria } = await importarFuente('functions/test/almacen-memoria.ts');
const respaldo = new Map();
let n = 0;
const c = await abrirCatalogoLocal(crearAlmacenMemoria(respaldo), { nuevoId: () => `w${String(++n).padStart(4, '0')}` });
const p = await c.crearProyecto({ name: 'Sin nube' });
await c.añadirRecurso(p.projectId, { nombre: 'a.txt', tipo: 'texto', datos: new TextEncoder().encode('a') });
const indice = JSON.parse(new TextDecoder().decode(respaldo.get('indice.json')));
check('W4) el índice guardado dice respaldo ninguno y sincronización no habilitada', indice.proyectos.every((x) => x.respaldo === 'ninguno' && x.sincronizacion === 'no_habilitada'));

/* W5. Ningún módulo del cliente sube un proyecto local a la nube. */
const rastreados = execFileSync('git', ['ls-files', 'services', 'screens', 'components', 'hooks', 'utils'], { cwd: RAIZ, encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(ts|tsx)$/.test(f));
const SUBE_LOCAL = /catalogoLocal[\s\S]{0,4000}(uploadBytes|uploadToCloudinary|httpsCallable\(\s*functions\s*,\s*['"](subirProyecto|weeCloud|respaldar))/;
check('W5) CONTROL: el detector caza una subida plantada', SUBE_LOCAL.test("import { abrirCatalogoLocal } from './catalogoLocal'; uploadBytes(ref, datos)"));
const conSubida = rastreados.filter((f) => SUBE_LOCAL.test(fs.readFileSync(path.join(RAIZ, f), 'utf8')));
check(`W5) ninguno de los ${rastreados.length} archivos del cliente combina el catálogo local con una subida`, conSubida.length === 0, conSubida.join(', '));

console.log(fallos === 0 ? '\nPC-PERSISTENCIA CLOUD: OK' : `\nPC-PERSISTENCIA CLOUD: ${fallos} fallo(s)`);
process.exit(fallos === 0 ? 0 : 1);
