/**
 * R9 · LÍNEA C (persistencia y coste) · guardado LOCAL por defecto.
 *
 * Qué certifica (con controles que demuestran que cada aserción puede fallar):
 *   L1  errores del sistema → códigos del almacén (permiso, espacio, ausente), con los
 *       textos del código nativo INSTALADO de expo-file-system 19 (Android).
 *   L2  SAF con el permiso revocado devuelve `no_disponible` (la sección lo convierte en
 *       «permiso perdido»), no un error crudo.
 *   L3  mover en SAF copia, VERIFICA y solo entonces borra el origen.
 *   L4  sin espacio: falla ANTES de tocar nada y no deja estado a medias.
 *   L5  reintento idempotente de `añadirRecurso`: no duplica bytes ni escribe de nuevo.
 *   L6  reintento cuando la copia anterior falta: se vuelve a guardar (no se da por guardado).
 *   L7  renombrar sin cambio real no escribe nada.
 *   L8  reapertura: lo guardado sigue ahí y se lee con su huella.
 *   L9  las claves no salen de la carpeta de la app.
 *   L10 guardar local no toca la nube ni Credits (escaneo estático de los módulos).
 *
 * NO CERTIFICA HARDWARE: los dobles modelan las reglas documentadas de cada API.
 * No hay un Android conectado; la validación en dispositivo queda PENDIENTE.
 *
 *   node functions/test/pc-persistencia-local.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importarFuente, RAIZ } from './_cargador-local-first.mjs';
import { crearDisco, crearDobleSAF } from './_dobles-local-first.mjs';

const { abrirCatalogoLocal } = await importarFuente('utils/catalogoLocal.ts');
const { crearAlmacenMemoria } = await importarFuente('functions/test/almacen-memoria.ts');
const { ErrorAlmacenLocal, validarClave } = await importarFuente('services/almacenLocal/tipos.ts');
const { codigoDeErrorNativo, conErroresTraducidos } = await importarFuente('services/almacenLocal/erroresNativos.ts');
const { crearPuertoSAF } = await importarFuente('services/almacenLocal/puertoSAF.ts');
const { crearPuertoDeRuta } = await importarFuente('services/almacenLocal/puertoDeRuta.ts');
const { crearAlmacenSobrePuerto } = await importarFuente('services/almacenLocal/sobrePuerto.ts');

let fallos = 0;
const check = (nombre, cond, extra = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const codigoDe = async (promesa) => {
  try {
    await promesa;
    return null;
  } catch (error) {
    return error?.codigo ?? `no_tipado: ${error?.message}`;
  }
};
const bytesDe = (texto) => new TextEncoder().encode(texto);
const textoDe = (datos) => new TextDecoder().decode(datos);
const reloj = () => {
  let t = 1_700_000_000_000;
  return () => (t += 1000);
};
const ids = (prefijo) => {
  let n = 0;
  return () => `${prefijo}${String(++n).padStart(4, '0')}`;
};
/** Envuelve un almacén y cuenta sus escrituras. */
const contado = (almacen) => {
  const cuenta = { escrituras: 0 };
  return {
    cuenta,
    almacen: {
      ...almacen,
      plataforma: almacen.plataforma,
      async escribir(clave, datos) {
        cuenta.escrituras++;
        return almacen.escribir(clave, datos);
      },
    },
  };
};

/* L1. Traducción de errores del sistema. */
const casos = [
  ["Location 'content://x/WEE/a' isn't writable.", 'no_disponible'],
  ["Location 'file:///data/x' isn't readable.", 'no_disponible'],
  ["Location 'x' doesn't have permission 'WRITE'.", 'no_disponible'],
  ['java.lang.SecurityException: Permission Denial: reading com.android.externalstorage', 'no_disponible'],
  ['write failed: ENOSPC (No space left on device)', 'sin_espacio'],
  ["Uri 'content://x' doesn't exist or isn't a directory", 'no_encontrado'],
  ["File 'file:///x' could not be deleted because it could not be found", 'no_encontrado'],
  ['java.io.FileNotFoundException: /x (No such file or directory)', 'no_encontrado'],
];
for (const [mensaje, esperado] of casos) {
  const obtenido = codigoDeErrorNativo(new Error(mensaje));
  check(`L1) «${mensaje.slice(0, 48)}…» → ${esperado}`, obtenido === esperado, obtenido);
}
check('L1) CONTROL: un error ajeno queda desconocido (no se fuerza ningún código)', codigoDeErrorNativo(new Error('algo raro')) === 'desconocido');
check('L1) un ErrorAlmacenLocal pasa con su código', codigoDeErrorNativo(new ErrorAlmacenLocal('corrupto')) === 'corrupto');
const envueltas = conErroresTraducidos({
  async bien() {
    return 7;
  },
  async mal() {
    throw new Error("Location 'x' isn't writable.");
  },
});
check('L1) CONTROL: lo que funciona devuelve lo mismo envuelto', (await envueltas.bien()) === 7);
const errorEnvuelto = await envueltas.mal().catch((e) => e);
check('L1) lo que falla sale como ErrorAlmacenLocal tipado', errorEnvuelto instanceof ErrorAlmacenLocal && errorEnvuelto.codigo === 'no_disponible');

/* L2. SAF con el permiso revocado, con el texto real de Android. */
{
  const saf = crearDobleSAF();
  let revocado = false;
  const reales = saf.operaciones;
  const conTextoReal = {};
  for (const [nombre, fn] of Object.entries(reales)) {
    conTextoReal[nombre] = async (...a) => {
      if (revocado) throw new Error(`Location '${a[0]}' isn't writable.`);
      return fn(...a);
    };
  }
  const almacen = crearAlmacenSobrePuerto(crearPuertoSAF(saf.raizUri, conErroresTraducidos(conTextoReal)), { plataforma: 'nativo', persistencia: 'no_garantizada' });
  await almacen.escribir('proyectos/p1/recursos/r1', bytesDe('hola'));
  check('L2) CONTROL: con permiso se escribe y se lee', textoDe(await almacen.leer('proyectos/p1/recursos/r1')) === 'hola');
  revocado = true;
  check('L2) sin permiso, escribir da no_disponible (no un error crudo)', (await codigoDe(almacen.escribir('proyectos/p1/recursos/r2', bytesDe('x')))) === 'no_disponible');
  check('L2) sin permiso, leer da no_disponible', (await codigoDe(almacen.leer('proyectos/p1/recursos/r1'))) === 'no_disponible');
  const sinTraducir = crearAlmacenSobrePuerto(crearPuertoSAF(saf.raizUri, conTextoReal), { plataforma: 'nativo', persistencia: 'no_garantizada' });
  check('L2) CONTROL: sin la traducción el error llega crudo (lo que pasaba antes)', String(await codigoDe(sinTraducir.leer('proyectos/p1/recursos/r1'))).startsWith('no_tipado'));
}

/* L3. mover en SAF verifica la copia antes de borrar el origen. */
{
  const saf = crearDobleSAF();
  let corromper = false;
  const ops = {
    ...saf.operaciones,
    async escribir(uri, datos) {
      return saf.operaciones.escribir(uri, corromper ? datos.slice(0, Math.max(0, datos.byteLength - 1)) : datos);
    },
  };
  const puerto = crearPuertoSAF(saf.raizUri, ops);
  await puerto.escribir('a/origen', bytesDe('contenido'));
  corromper = true;
  const codigo = await codigoDe(puerto.mover('a/origen', 'a/destino'));
  corromper = false;
  check('L3) una copia que no queda idéntica falla como corrupto', codigo === 'corrupto', String(codigo));
  check('L3) y el origen sigue intacto', textoDe(await puerto.leer('a/origen').catch(() => new Uint8Array(0))) === 'contenido');
  check('L3) y no queda un destino a medias', (await puerto.tipoDe('a/destino')) === null);
  await puerto.borrar('a/destino');
  await puerto.escribir('a/origen', bytesDe('contenido'));
  await puerto.mover('a/origen', 'a/destino');
  check('L3) CONTROL: una copia correcta mueve de verdad', (await puerto.tipoDe('a/origen')) === null && textoDe(await puerto.leer('a/destino')) === 'contenido');
}

/* L4. Sin espacio (disco real de Node con capacidad), sin estado a medias. */
{
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-persistencia-'));
  try {
    const disco = crearDisco(raiz, { capacidad: 1500 });
    const libre = { ...disco.operaciones, async espacioLibre() { return null; } };
    const almacen = crearAlmacenSobrePuerto(crearPuertoDeRuta(raiz, libre), { plataforma: 'nativo', persistencia: 'no_garantizada' });
    const catalogo = await abrirCatalogoLocal(almacen, { ahora: reloj(), nuevoId: ids('d') });
    const proyecto = await catalogo.crearProyecto({ name: 'Disco' });
    const antes = JSON.stringify(catalogo.proyecto(proyecto.projectId));
    const codigo = await codigoDe(catalogo.añadirRecurso(proyecto.projectId, { nombre: 'grande.bin', tipo: 'otro', datos: new Uint8Array(4000) }));
    check('L4) lo que no cabe lanza sin_espacio', codigo === 'sin_espacio', String(codigo));
    check('L4) y el proyecto queda como estaba', JSON.stringify(catalogo.proyecto(proyecto.projectId)) === antes);
    const sobrantes = fs.readdirSync(raiz, { recursive: true }).filter((n) => String(n).endsWith('.tmp') || String(n).endsWith('.anterior'));
    check('L4) sin temporales ni apartados en el disco', sobrantes.length === 0, sobrantes.join(','));
    const pequeno = await catalogo.añadirRecurso(proyecto.projectId, { nombre: 'p.txt', tipo: 'texto', datos: bytesDe('ok') });
    check('L4) CONTROL: lo que cabe se guarda', pequeno.estado === 'local');
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
}

/* L5–L8. Idempotencia, reintento y reapertura sobre el catálogo. */
{
  const respaldo = new Map();
  const { almacen, cuenta } = contado(crearAlmacenMemoria(respaldo));
  const catalogo = await abrirCatalogoLocal(almacen, { ahora: reloj(), nuevoId: ids('i') });
  const proyecto = await catalogo.crearProyecto({ name: 'Idempotencia' });
  const primero = await catalogo.añadirRecurso(proyecto.projectId, { nombre: 'logo.png', tipo: 'imagen', mimeType: 'image/png', datos: bytesDe('pixeles') });
  const escriturasTrasPrimero = cuenta.escrituras;
  const reintento = await catalogo.añadirRecurso(proyecto.projectId, { nombre: 'logo.png', tipo: 'imagen', mimeType: 'image/png', datos: bytesDe('pixeles') });
  const recursosEnDisco = () => [...respaldo.keys()].filter((k) => k.startsWith(`proyectos/${proyecto.projectId}/recursos/`));
  check('L5) el reintento devuelve el MISMO recurso', reintento.recursoId === primero.recursoId);
  check('L5) no escribe nada más (ni bytes ni índice)', cuenta.escrituras === escriturasTrasPrimero, `${escriturasTrasPrimero}→${cuenta.escrituras}`);
  check('L5) un solo archivo en el disco y itemCount 1', recursosEnDisco().length === 1 && catalogo.proyecto(proyecto.projectId).itemCount === 1);
  const otroNombre = await catalogo.añadirRecurso(proyecto.projectId, { nombre: 'logo-copia.png', tipo: 'imagen', datos: bytesDe('pixeles') });
  const otrosBytes = await catalogo.añadirRecurso(proyecto.projectId, { nombre: 'logo.png', tipo: 'imagen', datos: bytesDe('pixeles v2') });
  check('L5) CONTROL: otro nombre con los mismos bytes es otro archivo (no se fusiona lo distinto)', otroNombre.recursoId !== primero.recursoId);
  check('L5) CONTROL: el mismo nombre con otros bytes es otro archivo', otrosBytes.recursoId !== primero.recursoId && recursosEnDisco().length === 3);

  // L6: la copia anterior desaparece (borrada desde el gestor de archivos) → se vuelve a guardar.
  respaldo.delete(`proyectos/${proyecto.projectId}/recursos/${primero.recursoId}`);
  const tras = await catalogo.añadirRecurso(proyecto.projectId, { nombre: 'logo.png', tipo: 'imagen', datos: bytesDe('pixeles') });
  check('L6) con la copia ausente NO se da por guardado: se escribe una nueva', tras.recursoId !== primero.recursoId && respaldo.has(`proyectos/${proyecto.projectId}/recursos/${tras.recursoId}`));
  check('L6) y la nueva se lee con su huella', textoDe(await catalogo.leerRecurso(proyecto.projectId, tras.recursoId)) === 'pixeles');

  // L7: renombrar sin cambio no escribe.
  const antesDeRenombrar = cuenta.escrituras;
  const igual = await catalogo.renombrar(proyecto.projectId, '  Idempotencia ');
  check('L7) renombrar al mismo nombre (normalizado) no escribe nada', cuenta.escrituras === antesDeRenombrar && igual.name === 'Idempotencia');
  const sello = catalogo.proyecto(proyecto.projectId).updatedAt;
  check('L7) ni cambia updatedAt', igual.updatedAt === sello);
  await catalogo.renombrar(proyecto.projectId, 'Otro nombre');
  check('L7) CONTROL: un nombre distinto sí escribe', cuenta.escrituras > antesDeRenombrar && catalogo.proyecto(proyecto.projectId).name === 'Otro nombre');

  // L8: reapertura.
  const reabierto = await abrirCatalogoLocal(crearAlmacenMemoria(respaldo), { ahora: reloj(), nuevoId: ids('r') });
  const visto = reabierto.proyecto(proyecto.projectId);
  check('L8) tras reabrir, el proyecto y su nombre siguen', visto?.name === 'Otro nombre');
  check('L8) el recurso guardado se lee intacto', textoDe(await reabierto.leerRecurso(proyecto.projectId, otrosBytes.recursoId)) === 'pixeles v2');
  check('L8) el que se borró por fuera se ve ausente (no se inventa)', (await reabierto.verificarRecurso(proyecto.projectId, primero.recursoId)) === 'ausente');
  check('L8) ningún recurso guarda una URL como identidad', visto.recursos.every((r) => !/:\/\//.test(r.recursoId) && !('url' in r)));
}

/* L9. Claves seguras: nada sale de la carpeta de la app. */
for (const mala of ['../fuera', 'proyectos/../../etc', '/absoluta', 'a//b', 'proyectos/x/recursos/r.tmp']) {
  let lanzo = false;
  try {
    validarClave(mala);
  } catch {
    lanzo = true;
  }
  check(`L9) la clave «${mala}» se rechaza`, lanzo);
}
check('L9) CONTROL: una clave normal se acepta', validarClave('proyectos/p1/recursos/r1') === 'proyectos/p1/recursos/r1');

/* L10. Guardar local no toca la nube ni Credits. */
const PROHIBIDO = /firebase\/|httpsCallable|spendCredits|completeCredits|refundCredits|creditsService|cloudinary|fetch\(|XMLHttpRequest|uploadBytes/;
const escanear = (texto) => PROHIBIDO.test(texto);
check('L10) CONTROL: el escáner detecta una llamada plantada', escanear("import { httpsCallable } from 'firebase/functions'"));
const modulos = [
  ...fs.readdirSync(path.join(RAIZ, 'services/almacenLocal')).map((n) => `services/almacenLocal/${n}`),
  'utils/catalogoLocal.ts',
  'utils/bundleLocal.ts',
  'utils/seccionDelDispositivo.ts',
  'utils/ubicacionWee.ts',
  'utils/bytes.ts',
  'utils/sha256.ts',
];
const conNube = modulos.filter((m) => escanear(fs.readFileSync(path.join(RAIZ, m), 'utf8')));
check(`L10) ninguno de los ${modulos.length} módulos local-first llama a la nube ni a Credits`, conNube.length === 0, conNube.join(', '));
{
  const catalogo = await abrirCatalogoLocal(crearAlmacenMemoria(new Map()), { ahora: reloj(), nuevoId: ids('n') });
  const p = await catalogo.crearProyecto({ name: 'Local' });
  check('L10) un proyecto local nace sin respaldo en la nube ni sincronización', p.respaldo === 'ninguno' && p.sincronizacion === 'no_habilitada' && p.ubicacion === 'este_dispositivo');
}

/* L11. La integración nativa (expo-file-system, no ejecutable en Node) usa la traducción. */
{
  const usaTraduccion = (texto) =>
    /operacionesDeRuta: OperacionesDeRuta = conErroresTraducidos</.test(texto) && /operacionesSAF: OperacionesSAF = conErroresTraducidos</.test(texto);
  check('L11) CONTROL: el detector rechaza unas operaciones sin envolver', !usaTraduccion('const operacionesDeRuta: OperacionesDeRuta = {'));
  check('L11) ubicacion.ts envuelve las operaciones de ruta (iOS) y de SAF (Android)', usaTraduccion(fs.readFileSync(path.join(RAIZ, 'services/almacenLocal/ubicacion.ts'), 'utf8')));
}

console.log(fallos === 0 ? '\nPC-PERSISTENCIA LOCAL: OK' : `\nPC-PERSISTENCIA LOCAL: ${fallos} fallo(s)`);
process.exit(fallos === 0 ? 0 : 1);
