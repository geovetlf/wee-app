/*
 * ¿LAS GUARDAS DE ADMINISTRACIÓN PROTEGEN DE VERDAD? Rompe a propósito cada frontera, una a una, corre las suites que
 * tendrían que enterarse y restaura el archivo. Una suite que sigue en verde con su frontera rota no protege nada.
 *
 *   npm run build --prefix functions && node functions/test/_sabotajes-admin.mjs [--solo <texto>]
 *
 * Toca archivos del árbol (src, lib, reglas, CI) y los deja byte a byte como estaban, también si algo falla. Por eso no está
 * en la cadena: no puede correr a la vez que otras suites. Solo escribe en este árbol: ni emuladores, ni red, ni nada real.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const SEG = 'admin-seguridad';
const L = 'functions/lib/admin/';

/* [nombre, archivo, texto, sustituto, suites que deben caer] */
const SABOTAJES = [
  ['autorización · una cuenta deshabilitada entra', `${L}autorizacion.js`, 'if (usuario.disabled)', 'if (false)', [SEG]],
  ['autorización · las sesiones revocadas valen', `${L}autorizacion.js`, '!(emitido >= validoDesde)', 'false', [SEG]],
  ['autorización · si Auth falla, se fía del token', `${L}autorizacion.js`, "throw new https_1.HttpsError('unavailable', 'No se pudo comprobar el permiso');", 'return auth;', [SEG]],
  ['autorización · sin la relectura en Auth', `${L}autorizacion.js`, 'const vigente = (_b = d.vigente) !== null && _b !== void 0 ? _b : exports.sesionVigente;', 'const vigente = async (a) => a;', [SEG]],
  ['permisos · el legado pasa con cualquier rol', `${L}permisos.js`, '_a.weeRole) === undefined', '_a.weeRole) !== null', [SEG]],
  ['permisos · soporte puede dar Credits', `${L}permisos.js`, "support: Object.freeze(['accounts.read'])", "support: Object.freeze(['accounts.read', 'credits.grant'])", [SEG]],
  ['catálogo · dar Credits solo pide leer finanzas', `${L}operaciones.js`, "permiso: 'credits.grant'", "permiso: 'finance.read'", [SEG]],
  ['catálogo · clasificar con otra expresión que el cuerpo', `${L}operaciones.js`, "String(d.action || 'stats')", "(typeof d.action === 'string' && d.action ? d.action : 'stats')", [SEG]],
  ['auditoría · actuar sin `intento`', `${L}autorizacion.js`, "await d.auditoria.registrar(Object.assign(Object.assign(Object.assign({}, contexto), actor), { resultado: 'intento' }));", '', [SEG]],
  ['auditoría · un fallo se registra como `ok`', `${L}autorizacion.js`, "resultado: 'error', codigoDeError: codigo", "resultado: 'ok', codigoDeError: codigo", [SEG]],
  ['auditoría · el cierre no dice el desenlace', `${L}autorizacion.js`, 'resultadoDuplicado: simple(x.duplicate), ', '', [SEG]],
  ['auditoría · entrada con arrays se ejecuta', `${L}autorizacion.js`, 'clase.entradaInvalida ?', 'false ?', [SEG]],
  ['auditoría · cualquier texto llega a recurso.id', `${L}operaciones.js`, "typeof id === 'string' && ID_SEGURO.test(id)", "typeof id === 'string'", [SEG]],
  ['lecturas · el estado del motor enseña el dinero', `${L}operaciones.js`, "(0, permisos_1.esLegado)(sesion) || (0, permisos_1.tienePermiso)(sesion, 'finance.read')", 'true', [SEG]],
  ['lecturas · vacío y parcial parece «no hay»', `${L}lecturas.js`, 'parcial: agotado', 'parcial: false', [SEG]],
  ['lecturas · lo que está dentro de plazo parece atascado', `${L}lecturas.js`, 'dentroDePlazo: limite !== null && limite > t', 'dentroDePlazo: false', [SEG]],
  ['lecturas · un aviso apartado cuenta como retrasado', `${L}lecturas.js`, 'retrasado: !apartado && !enVuelo &&', 'retrasado: !enVuelo &&', [SEG]],
  ['scripts · retirar quita el rol y deja admin', 'ops/admin/retirar-rol.mjs', ': resto;', ': { ...resto, admin };', [SEG]],
  ['scripts · retirar no pide la comprobación de la lista', 'ops/admin/retirar-rol.mjs', "&& !fueraDeLaLista", '&& false', [SEG]],
  ['scripts · asignar sin `intento`', 'ops/admin/asignar-owner.mjs', "await anotar('intento');", '', [SEG, 'admin-lecturas']],
  ['transición · se puede cerrar sin owner', 'ops/admin/inventario.mjs', 'owners.length === 0', 'false', [SEG]],
  ['conciliación · confunde lo que ocurrió', 'ops/admin/intentos-sin-cierre.mjs', 'else if (libro.existe)', 'else if (!libro.existe)', [SEG]],
  ['reglas · un rol limitado escribe por administración', 'firestore.rules', " && request.auth.token.get('weeRole', 'owner') == 'owner'", '', ['security', 'comunidades-siembra', SEG]],
  ['reglas · adminAudit abierta', 'firestore.rules', 'match /adminAudit/{entradaId} {\n      allow read, write: if false;', 'match /adminAudit/{entradaId} {\n      allow read, write: if request.auth != null;', [SEG, 'admin-lecturas']],
  ['congelado · una línea más en los callables de Credits', 'functions/src/credits/index.ts', "const uidOf =", "const colada = 1;\nconst uidOf =", ['job-queue', 'puente-pre-f1d', 'f1d-generacion', 'video-asincrono']],
  ['congelado · dar Credits sin la puerta', 'functions/src/credits/index.ts', "return operacionAdmin(claseDeCredits('grantCredits', data.userId, { ...data, requestId }), request.auth as any, () => creditEngine.grantCredits({", 'return creditEngine.grantCredits({', ['job-queue']],
  ['congelado · una línea más en el panel del motor', 'functions/src/engine/admin.ts', 'const db = () => getFirestore();', 'const colada = 1;\nconst db = () => getFirestore();', ['puente-pre-f1d', 'video-asincrono']],
  ['congelado · tocar el Credit Engine', 'functions/src/credits/creditEngine.ts', 'export const creditEngine', 'const colada = 1;\nexport const creditEngine', ['job-queue', 'puente-pre-f1d', 'f1d-generacion', 'video-asincrono']],
  ['congelado · un archivo nuevo de administración sin registrar', 'functions/test/_seguridad-de-administracion.mjs', "'functions/src/admin/operaciones.ts', ", '', ['puente-pre-f1d']],
  ['mapa · una Function más', 'functions/src/index.ts', "export { opsAdmin, accountsAdmin } from './admin';", "export { opsAdmin, accountsAdmin } from './admin';\nexport { opsAdmin as colada } from './admin';", ['runtime-map']],
  ['mapa · el recuento de Functions cambia sin que nadie lo diga', 'functions/test/runtime-map.test.mjs', 'reales.length === 39', 'reales.length >= 39', ['productions-runtime']],
  ['mapa · una Function menos', 'functions/src/index.ts', "export { opsAdmin, accountsAdmin } from './admin';", "export { opsAdmin } from './admin';", ['runtime-map']],
  ['consola · una escritura en la lista permitida', 'admin-console/src/api/acciones.ts', "'creditsAdmin.costs': {", "'creditsAdmin.setCost': { callable: 'creditsAdmin', accion: 'setCost', parametros: [] },\n  'creditsAdmin.costs': {", ['admin-console-frontera']],
  ['consola · el menú sin la comprobación del servidor', 'admin-console/src/vistas/Consola.tsx', "useAccion('opsAdmin.quienSoy', undefined, leerIdentidad)", "useAccion('engineAdmin.status', undefined, leerIdentidad)", ['admin-console-frontera']],
  ['CI · la consola fuera de los niveles', '.github/workflows/ci.yml', 'npm test --prefix admin-console', 'true', [SEG]],
  ['CI · un quinto check que nadie exige', 'ops/despliegue/plan.mjs', "'Nivel 3 · seguridad y políticas']", "'Nivel 3 · seguridad y políticas', 'Consola']", ['ci-workflow']],
  ['índices · un compuesto en el Job Engine', 'firestore.indexes.json', '"collectionGroup": "jobQueue"', '"collectionGroup": "jobs"', [SEG]],
];

const solo = process.argv.includes('--solo') ? process.argv[process.argv.indexOf('--solo') + 1] : null;
const corre = (suite) => {
  const r = spawnSync(process.execPath, [`functions/test/${suite}.test.mjs`], { cwd: RAIZ, encoding: 'utf8', timeout: 240_000 });
  return r.status === 0;
};

let escapadas = 0;
let total = 0;
for (const [nombre, archivo, texto, sustituto, suites] of SABOTAJES) {
  if (solo && !nombre.includes(solo)) continue;
  total++;
  const ruta = path.join(RAIZ, archivo);
  const original = fs.readFileSync(ruta);
  const fuente = original.toString('utf8');
  const eol = fuente.includes('\r\n') ? '\r\n' : '\n';
  const buscado = texto.replace(/\n/g, eol);
  if (!fuente.includes(buscado)) { escapadas++; console.log(`✘ ${nombre} — el texto a sabotear ya no está: ${texto.slice(0, 60)}`); continue; }
  try {
    fs.writeFileSync(ruta, fuente.replace(buscado, () => sustituto.replace(/\n/g, eol)));
    const siguenVerdes = suites.filter((s) => corre(s));
    if (siguenVerdes.length) { escapadas++; console.log(`✘ ${nombre} — NO lo vio: ${siguenVerdes.join(', ')}`); } else console.log(`✔ ${nombre} — ${suites.join(', ')}`);
  } finally {
    fs.writeFileSync(ruta, original);
  }
}
console.log(escapadas ? `\n✘ ${escapadas} de ${total} sabotajes sin detectar` : `\n✔ ${total}/${total} sabotajes detectados`);
process.exit(escapadas ? 1 : 0);
