/**
 * LÍNEA B1 (local-first) · ubicación WEE: primera activación, reapertura, permisos,
 * espacio, interrupción y exportar/importar entre carpetas, en iOS, Android (SAF),
 * la web (File System Access + IndexedDB) y OPFS.
 *
 * DOBLES (ver _dobles-local-first.mjs). NO CERTIFICAN HARDWARE: modelan las reglas de
 * cada API. Queda PENDIENTE probarlo en un dispositivo Android (sin uno conectado) y en
 * un navegador real; la persistencia del permiso SAF tras un reinicio no se puede probar aquí.
 *
 * Cargador: `_cargador-local-first.mjs` (transpila los .ts con el `typescript` de functions/).
 *
 *   node functions/test/local-first-ubicacion.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importarFuente } from './_cargador-local-first.mjs';
import { crearDisco, crearDobleSAF, crearCarpetaWeb, crearFabricaIdb } from './_dobles-local-first.mjs';

const ubicacion = await importarFuente('utils/ubicacionWee.ts');
const puertos = await importarFuente('services/almacenLocal/puertosDeUbicacion.ts');
const registroIdb = await importarFuente('services/almacenLocal/registroIdb.ts');
const { crearAlmacenSobrePuerto } = await importarFuente('services/almacenLocal/sobrePuerto.ts');
const { crearPuertoDeRuta } = await importarFuente('services/almacenLocal/puertoDeRuta.ts');
const { abrirCatalogoLocal } = await importarFuente('utils/catalogoLocal.ts');
const { codificarBundle, decodificarBundle } = await importarFuente('utils/bundleLocal.ts');
const { ErrorAlmacenLocal } = await importarFuente('services/almacenLocal/tipos.ts');

const { transicionar, activarUbicacion, recuperarUbicacion, reconcederUbicacion, disponibilidadDelProyecto, AJUSTES_DE_ALMACENAMIENTO, CARPETA_WEE } = ubicacion;

let fallos = 0;
const check = (nombre, cond, extra = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const reloj = () => {
  let t = 1_700_000_000_000;
  return () => (t += 1000);
};
const tiendaEnMemoria = (mapa = new Map()) => ({
  mapa,
  async leer() {
    return mapa.get('registro') ?? null;
  },
  async guardar(registro) {
    mapa.set('registro', registro);
  },
  async borrar() {
    mapa.delete('registro');
  },
});
const errorConNombre = (nombre) => Object.assign(new Error(nombre), { name: nombre });
const temporal = (nombre) => fs.mkdtempSync(path.join(os.tmpdir(), `wee-b1-ubicacion-${nombre}-`));
const hijosDe = (carpeta) => fs.readdirSync(carpeta).sort();

/* ── iOS: la sandbox de la app, sin selector ───────────────────────────────── */
{
  const sandbox = temporal('ios');
  const sandboxConBarra = `${sandbox}${path.sep}`.split(path.sep).join('/');
  const disco = crearDisco(sandbox);
  const tienda = tiendaEnMemoria();
  const puerto = puertos.crearUbicacionSandbox({ carpetaDelSistema: async () => sandboxConBarra, operaciones: disco.operaciones });

  const primera = await activarUbicacion(puerto, tienda, reloj());
  check('I1) iOS · primera activación: sin_configurar → pidiendo_permiso → creando → verificando → disponible', primera.estado === 'disponible' && primera.recorrido.join('>') === 'pidiendo_permiso>creando>verificando>disponible', primera.recorrido.join('>'));
  check('I2) iOS · se crea WEE en la sandbox y la prueba de escritura no deja restos', hijosDe(sandbox).join(',') === CARPETA_WEE && fs.readdirSync(path.join(sandbox, CARPETA_WEE)).length === 0 && tienda.mapa.has('registro'));

  const reabierta = await recuperarUbicacion(puerto, tienda);
  check('I3) iOS · reapertura: la carpeta guardada se reconoce sin preguntar', reabierta.estado === 'disponible' && reabierta.motivo === null);
  const segunda = await activarUbicacion(puerto, tienda, reloj());
  check('I4) iOS · segunda activación SIN duplicar: no aparece otra carpeta WEE', segunda.estado === 'disponible' && hijosDe(sandbox).join(',') === CARPETA_WEE, hijosDe(sandbox).join(','));

  const sinSandbox = puertos.crearUbicacionSandbox({ carpetaDelSistema: async () => null, operaciones: disco.operaciones });
  const noDisponible = await activarUbicacion(sinSandbox, tiendaEnMemoria(), reloj());
  check('I5) iOS · ubicación no disponible: el sistema no da carpeta → no_disponible, sin registro', noDisponible.estado === 'no_disponible' && noDisponible.registro === null && noDisponible.recorrido.join('>') === 'pidiendo_permiso>no_disponible');

  const discoLleno = crearDisco(path.join(sandbox, 'lleno'), { capacidad: 5 });
  const puertoLleno = puertos.crearUbicacionSandbox({ carpetaDelSistema: async () => sandboxConBarra, operaciones: discoLleno.operaciones });
  const sinEspacio = await activarUbicacion(puertoLleno, tiendaEnMemoria(), reloj());
  check('I6) iOS · sin espacio durante la verificación → sin_espacio, y la app no queda rota', sinEspacio.estado === 'sin_espacio' && sinEspacio.registro === null, sinEspacio.motivo ?? '');
  const reintentada = await activarUbicacion(puerto, tiendaEnMemoria(), reloj());
  check('I7) iOS · tras liberar espacio, pedir de nuevo funciona (sin_espacio → pidiendo_permiso)', reintentada.estado === 'disponible');

  let disparado = false;
  const discoCortado = crearDisco(path.join(sandbox, 'cortado'), {
    fallar: (operacion) => {
      if (!disparado && operacion === 'leer') {
        disparado = true;
        return true;
      }
      return false;
    },
  });
  const puertoCortado = puertos.crearUbicacionSandbox({ carpetaDelSistema: async () => sandboxConBarra, operaciones: discoCortado.operaciones });
  const interrumpida = await activarUbicacion(puertoCortado, tiendaEnMemoria(), reloj());
  check('I8) iOS · interrupción en la verificación → error_recuperable, sin registro a medias', disparado && interrumpida.estado === 'error_recuperable' && interrumpida.registro === null);
  const recuperada = await activarUbicacion(puertoCortado, tiendaEnMemoria(), reloj());
  check('I9) iOS · tras la interrupción, reintentar termina y no deja archivos de prueba en la carpeta WEE', recuperada.estado === 'disponible' && !fs.existsSync(path.join(sandbox, CARPETA_WEE, '.wee-verificacion')));

  fs.rmSync(sandbox, { recursive: true, force: true });
}

/* ── Android: Storage Access Framework (con dobles; sin dispositivo) ───────── */
{
  const saf = crearDobleSAF();
  const tienda = tiendaEnMemoria();
  const puerto = puertos.crearUbicacionSAF({
    elegirCarpeta: () => saf.elegirCarpeta(),
    puedeLeer: (uri) => saf.puedeLeer(uri),
    operaciones: saf.operaciones,
  });

  const primera = await activarUbicacion(puerto, tienda, reloj());
  check('A1) Android · primera activación con la carpeta que elige la persona: disponible', primera.estado === 'disponible' && saf.controles.nombresDelPadre(saf.raizUri).join(',') === CARPETA_WEE);

  const segunda = await activarUbicacion(puerto, tienda, reloj());
  check('A2) Android · segunda activación SIN duplicar: no aparece «WEE (1)»', segunda.estado === 'disponible' && saf.controles.duplicados() === 0 && saf.controles.nombresDelPadre(saf.raizUri).join(',') === CARPETA_WEE);

  saf.controles.denegarSelector();
  const denegada = await activarUbicacion(puerto, tiendaEnMemoria(), reloj());
  check('A3) Android · la persona no concede la carpeta → permiso_denegado (la app sigue, se puede reintentar)', denegada.estado === 'permiso_denegado' && denegada.motivo === 'permiso_denegado' && denegada.registro === null);
  saf.controles.concederSelector();
  const reintento = await activarUbicacion(puerto, tiendaEnMemoria(), reloj());
  check('A4) Android · reintentar tras denegar termina en disponible', reintento.estado === 'disponible');

  saf.controles.revocarPermiso();
  const perdida = await recuperarUbicacion(puerto, tienda);
  check('A5) Android · permiso perdido al reabrir → permiso_perdido (requiere elegir otra vez)', perdida.estado === 'permiso_perdido' && perdida.motivo === 'requiere_gesto', `${perdida.estado}/${perdida.motivo}`);
  const sinRecuperar = await reconcederUbicacion(puerto, tienda.mapa.get('registro'));
  check('A6) Android · pedir de nuevo sin el selector no concede nada: sigue permiso_perdido', sinRecuperar.estado === 'permiso_perdido');
  saf.controles.restaurarPermiso();
  const eligiendoOtra = await activarUbicacion(puerto, tienda, reloj());
  check('A7) Android · se vuelve a elegir la carpeta → disponible', eligiendoOtra.estado === 'disponible');

  const espacioDesconocido = await recuperarUbicacion(puerto, tienda);
  check('A8) Android · el espacio libre no se conoce (null): no bloquea ni se toma por cero', espacioDesconocido.estado === 'disponible');

  let fallido = false;
  saf.controles.fallarEn((operacion) => {
    if (!fallido && operacion === 'crearArchivo') {
      fallido = true;
      return true;
    }
    return false;
  });
  const sinCreacion = await activarUbicacion(puerto, tiendaEnMemoria(), reloj());
  check('A9) Android · un fallo al crear el archivo de prueba → error_recuperable, sin registro', fallido && sinCreacion.estado === 'error_recuperable' && sinCreacion.registro === null);
  saf.controles.fallarEn(null);
}

/* ── Web: carpeta del ordenador (File System Access) con IndexedDB ─────────── */
{
  const fabrica = crearFabricaIdb();
  const registro = registroIdb.crearRegistroIdb(fabrica);
  const tienda = puertos.crearTiendaDeUbicacionEnRegistro(registro);
  const carpeta = crearCarpetaWeb('Documentos', { permiso: 'granted' });
  const puerto = puertos.crearUbicacionCarpetaWeb({ registro, elegirManejador: async () => carpeta.raiz, espacioLibre: async () => null });

  const primera = await activarUbicacion(puerto, tienda, reloj());
  check('W1) web · primera activación con el selector: disponible, WEE dentro de la carpeta', primera.estado === 'disponible' && carpeta.raiz.entradas.has(CARPETA_WEE));
  check('W2) web · el manejador de la carpeta se guarda en IndexedDB', fabrica.bases.get('wee-ubicacion').tiendas.get('claves').has('carpeta'));
  const segundaWeb = await activarUbicacion(puerto, tienda, reloj());
  const carpetasWeb = [...carpeta.raiz.entradas.keys()].filter((clave) => clave.startsWith(CARPETA_WEE));
  check('W2b) web · segunda activación SIN duplicar: una sola carpeta WEE dentro de la carpeta elegida', segundaWeb.estado === 'disponible' && carpetasWeb.length === 1 && carpetasWeb[0] === CARPETA_WEE, carpetasWeb.join(','));

  const otraSesion = puertos.crearTiendaDeUbicacionEnRegistro(registroIdb.crearRegistroIdb(fabrica));
  const reabierta = await recuperarUbicacion(puerto, otraSesion);
  check('W3) web · al volver (otra instancia, misma IndexedDB) con permiso concedido: disponible sin gesto', reabierta.estado === 'disponible' && reabierta.motivo === null);

  carpeta.estado.permiso = 'prompt';
  const pidiendo = await recuperarUbicacion(puerto, tienda);
  check('W4) web · permiso en «prompt» al volver → permiso_perdido (requiere un gesto de la persona)', pidiendo.estado === 'permiso_perdido' && pidiendo.motivo === 'requiere_gesto');
  const concedido = await reconcederUbicacion(puerto, pidiendo.registro);
  check('W5) web · el gesto de la persona concede el permiso → disponible', concedido.estado === 'disponible' && carpeta.estado.gestosDePermiso === 1);

  carpeta.estado.permiso = 'prompt';
  carpeta.estado.respuesta = 'denied';
  const negado = await reconcederUbicacion(puerto, pidiendo.registro);
  check('W6) web · la persona niega el permiso → sigue permiso_perdido, sin bloquear la app', negado.estado === 'permiso_perdido' && negado.motivo === 'permiso_denegado');
  carpeta.estado.respuesta = 'granted';

  const cancelado = puertos.crearUbicacionCarpetaWeb({ registro, elegirManejador: async () => { throw errorConNombre('AbortError'); }, espacioLibre: async () => null });
  const cerrado = await activarUbicacion(cancelado, tienda, reloj());
  check('W7) web · la persona cierra el selector → permiso_denegado (no es un fallo)', cerrado.estado === 'permiso_denegado');
  const navegadorSinPermiso = puertos.crearUbicacionCarpetaWeb({ registro, elegirManejador: async () => { throw errorConNombre('Otro'); }, espacioLibre: async () => null });
  const sinAcceso = await activarUbicacion(navegadorSinPermiso, tienda, reloj());
  check('W8) web · error inesperado del navegador → no_disponible', sinAcceso.estado === 'no_disponible');

  const carpetaLlena = crearCarpetaWeb('Llena', { capacidad: 5 });
  const llena = puertos.crearUbicacionCarpetaWeb({ registro, elegirManejador: async () => carpetaLlena.raiz, espacioLibre: async () => null });
  const sinEspacio = await activarUbicacion(llena, tiendaEnMemoria(), reloj());
  check('W9) web · el navegador se queda sin cuota (QuotaExceededError) → sin_espacio', sinEspacio.estado === 'sin_espacio' && sinEspacio.registro === null);

  const fabricaCaida = crearFabricaIdb({ fallarAbrir: true });
  const sinIdb = puertos.crearTiendaDeUbicacionEnRegistro(registroIdb.crearRegistroIdb(fabricaCaida));
  const sinRegistro = await activarUbicacion(puerto, sinIdb, reloj());
  check('W10) web · IndexedDB no abre → no_disponible; no queda un registro a medias', sinRegistro.estado === 'no_disponible' && sinRegistro.registro === null);
}

/* ── OPFS: espacio privado del navegador (no es carpeta del sistema) ───────── */
{
  const opfs = crearCarpetaWeb('opfs');
  const tienda = tiendaEnMemoria();
  const puerto = puertos.crearUbicacionOpfs({ raiz: async () => opfs.raiz, espacioLibre: async () => null });
  const primera = await activarUbicacion(puerto, tienda, reloj());
  check('O1) OPFS · primera activación: disponible, sin ningún selector ni permiso, dentro del espacio privado', primera.estado === 'disponible' && primera.registro.referenciaWee === 'opfs/WEE' && opfs.raiz.entradas.has(CARPETA_WEE));
  const segundaOpfs = await activarUbicacion(puerto, tienda, reloj());
  const carpetasOpfs = [...opfs.raiz.entradas.keys()].filter((clave) => clave.startsWith(CARPETA_WEE));
  check('O1b) OPFS · segunda activación SIN duplicar: una sola carpeta WEE en el espacio privado', segundaOpfs.estado === 'disponible' && carpetasOpfs.length === 1, carpetasOpfs.join(','));
  const reabierta = await recuperarUbicacion(puerto, tienda);
  check('O2) OPFS · reapertura: disponible', reabierta.estado === 'disponible');
  const sinOpfs = puertos.crearUbicacionOpfs({ raiz: async () => null, espacioLibre: async () => null });
  const sinNada = await activarUbicacion(sinOpfs, tiendaEnMemoria(), reloj());
  check('O3) sin OPFS → no_disponible', sinNada.estado === 'no_disponible');
}

/* ── Máquina de estados: transiciones inválidas no cambian nada ────────────── */
{
  const inválida = transicionar('disponible', 'iniciar');
  check('T1) una transición que no está en la tabla no cambia el estado (falla cerrada)', inválida.valida === false && inválida.estado === 'disponible');
  const valida = transicionar('sin_configurar', 'iniciar');
  check('T2) sin_configurar + iniciar → pidiendo_permiso', valida.valida && valida.estado === 'pidiendo_permiso');
  check('T3) creando + verificada no es válida (no se puede saltar la verificación)', transicionar('creando', 'verificada').valida === false);
}

/* ── Disponibilidad: un proyecto solo está disponible si su archivo se abre ── */
{
  check('D1) disponible si la ubicación está lista y el archivo se abre', disponibilidadDelProyecto('disponible', 'si') === 'disponible');
  check('D2) no encontrado si el archivo no existe', disponibilidadDelProyecto('disponible', 'no') === 'no_encontrado');
  check('D3) permiso perdido se nombra como tal', disponibilidadDelProyecto('permiso_perdido', 'no') === 'permiso_perdido');
  check('D4) sin ubicación disponible el proyecto no aparece como disponible', disponibilidadDelProyecto('no_disponible', 'si') === 'no_encontrado');
  check('D5) un fallo al abrir el archivo es error recuperable', disponibilidadDelProyecto('disponible', 'error') === 'error_recuperable');
  check('D6) «solo en la nube» es una forma que hoy nunca se usa para un proyecto local sin respaldo', disponibilidadDelProyecto('no_disponible', 'no', true) === 'solo_en_la_nube');
}

/* ── Ajustes por defecto: local, y la nube apagada ─────────────────────────── */
{
  check('P1) local por defecto: la ubicación es la carpeta WEE', AJUSTES_DE_ALMACENAMIENTO.ubicacion === 'carpeta_wee' && CARPETA_WEE === 'WEE');
  check('P2) la nube está DESACTIVADA por defecto (es opcional y de pago con Credits)', AJUSTES_DE_ALMACENAMIENTO.nube === 'desactivada');
}

/* ── Exportar e importar entre dos carpetas WEE, con la misma lógica de guardado ── */
{
  const origenDir = temporal('export-a');
  const destinoDir = temporal('export-b');
  const discoA = crearDisco(path.join(origenDir, CARPETA_WEE));
  const discoB = crearDisco(path.join(destinoDir, CARPETA_WEE));
  const catalogoA = await abrirCatalogoLocal(crearAlmacenSobrePuerto(crearPuertoDeRuta(path.join(origenDir, CARPETA_WEE), discoA.operaciones), { plataforma: 'nativo', persistencia: 'no_garantizada' }), { ahora: reloj(), nuevoId: (() => { let n = 0; return () => `a${String(++n).padStart(4, '0')}`; })() });
  const proyecto = await catalogoA.crearProyecto({ name: 'Mi restaurante', emoji: '🍔' });
  const archivo = await catalogoA.añadirRecurso(proyecto.projectId, { nombre: 'logo.png', tipo: 'imagen', mimeType: 'image/png', datos: new TextEncoder().encode('logo') });
  const { proyecto: pro, archivos } = await catalogoA.leerParaExportar(proyecto.projectId);
  const paquete = codificarBundle({ projectId: pro.projectId, name: pro.name, emoji: pro.emoji, createdAt: pro.createdAt, updatedAt: pro.updatedAt }, archivos.map(({ recurso, datos }) => ({ recursoId: recurso.recursoId, nombre: recurso.nombre, tipo: recurso.tipo, mimeType: recurso.mimeType, creadoEn: recurso.creadoEn, modificadoEn: recurso.modificadoEn, datos })), 1);
  const catalogoB = await abrirCatalogoLocal(crearAlmacenSobrePuerto(crearPuertoDeRuta(path.join(destinoDir, CARPETA_WEE), discoB.operaciones), { plataforma: 'nativo', persistencia: 'no_garantizada' }), { ahora: reloj(), nuevoId: (() => { let n = 0; return () => `b${String(++n).padStart(4, '0')}`; })() });
  const importado = await catalogoB.importarProyecto(decodificarBundle(paquete).entrada);
  const bytesDelLogo = new TextDecoder().decode(await catalogoB.leerRecurso(importado.projectId, archivo.recursoId));
  check('E1) exportar desde una carpeta WEE e importar en otra devuelve el mismo proyecto y el mismo archivo', importado.name === 'Mi restaurante' && bytesDelLogo === 'logo', `${importado.name}/${bytesDelLogo}`);
  check('E2) el paquete no contiene la carpeta de origen ni rutas del dispositivo', !new TextDecoder().decode(paquete).includes(origenDir));
  fs.rmSync(origenDir, { recursive: true, force: true });
  fs.rmSync(destinoDir, { recursive: true, force: true });
}

/* ── Recuperar: un fallo al leer o comprobar el registro no escapa de la máquina de estados ── */
{
  const tiendaRota = { async leer() { throw new Error('almacenamiento del aparato caído'); }, async guardar() {}, async borrar() {} };
  const puertoSano = { plataforma: 'android', async comprobarReferencia() { return 'concedida'; } };
  let lanzo = false;
  let r = null;
  try {
    r = await recuperarUbicacion(puertoSano, tiendaRota);
  } catch {
    lanzo = true;
  }
  check('R1) un fallo al leer el registro guardado no lanza: queda «error recuperable», sin registro (la sección no queda en blanco)',
    !lanzo && r?.estado === 'error_recuperable' && r.registro === null, `${lanzo}/${r?.estado}`);

  const registroGuardado = { plataforma: 'web-carpeta', referenciaPadre: 'idb:carpeta', referenciaWee: 'idb:carpeta/WEE', creadaEn: 1, verificadaEn: 1 };
  const puertoRoto = { plataforma: 'web-carpeta', async comprobarReferencia() { throw new Error('queryPermission falló'); } };
  const conRegistro = await recuperarUbicacion(puertoRoto, tiendaEnMemoria(new Map([['registro', registroGuardado]])));
  check('R2) si la comprobación falla con un registro guardado: «error recuperable» con registro, nunca «sin configurar» con registro',
    conRegistro.estado === 'error_recuperable' && conRegistro.registro !== null && conRegistro.motivo === 'desconocido', `${conRegistro.estado}/${conRegistro.motivo}`);
  check('T4) sin_configurar + error → error_recuperable (una transición válida, no un estado congelado)',
    transicionar('sin_configurar', 'error').valida === true && transicionar('sin_configurar', 'error').estado === 'error_recuperable');
}

/* ── Android: el nombre de cada hijo SAF se deduce de su URI (no hay API de nombres) ── */
{
  /* Una URI de documento como la devuelve Android: el árbol lleva el volumen y el documento lleva «volumen:ruta». */
  const uriDeDocumento = (idDeDocumento) => {
    const volumen = idDeDocumento.slice(0, idDeDocumento.indexOf(':') + 1);
    return `content://com.android.externalstorage.documents/tree/${encodeURIComponent(volumen)}/document/${encodeURIComponent(idDeDocumento)}`;
  };
  check('N1) carpeta dentro de Documentos → su nombre', puertos.nombreDeUriSAF(uriDeDocumento('primary:Documents/WEE')) === 'WEE');
  check('N2) hijo directo de la raíz del almacenamiento («primary:WEE») → «WEE», no «primary:WEE» (antes se duplicaba la carpeta)',
    puertos.nombreDeUriSAF(uriDeDocumento('primary:WEE')) === 'WEE', puertos.nombreDeUriSAF(uriDeDocumento('primary:WEE')));
  check('N3) archivo a varios niveles → su nombre', puertos.nombreDeUriSAF(uriDeDocumento('primary:Documents/WEE/proyectos/abc/recursos/x.bin')) === 'x.bin');
  check('N4) tarjeta SD (XXXX-XXXX) → nombre tras el volumen', puertos.nombreDeUriSAF(uriDeDocumento('1234-ABCD:DCIM/Camera')) === 'Camera');
  check('N5) nombres con % y con «:» en la raíz se conservan tal cual',
    puertos.nombreDeUriSAF(uriDeDocumento('primary:Documents/100%')) === '100%' && puertos.nombreDeUriSAF(uriDeDocumento('primary:Notas: 1')) === 'Notas: 1');
  check('N6) una URI con codificación rota no lanza', typeof puertos.nombreDeUriSAF('content://x/document/%E0%A4%A') === 'string');
}

/* ── Android: un proveedor cuyos ids no dan el nombre no crea carpetas en cada escritura ── */
{
  const saf = crearDobleSAF();
  const opacos = { ...saf.operaciones, async hijos(uri) { return (await saf.operaciones.hijos(uri)).map((hijo) => ({ ...hijo, nombre: `id-${hijo.uri.length}` })); } };
  const puerto = puertos.crearUbicacionSAF({ elegirCarpeta: () => saf.elegirCarpeta(), puedeLeer: async () => true, operaciones: opacos });
  let fallo = null;
  try {
    await puerto.crearWee(saf.raizUri);
  } catch (error) {
    fallo = error;
  }
  const sobrantes = saf.controles.nombresDelPadre(saf.raizUri);
  check('O4) nombres no legibles: crearWee falla con no_disponible y no deja la carpeta creada',
    fallo instanceof ErrorAlmacenLocal && fallo.codigo === 'no_disponible' && sobrantes.length === 0, `${fallo?.codigo}/${sobrantes.join(',')}`);
  const activada = await activarUbicacion(puerto, tiendaEnMemoria(), reloj());
  check('O5) la activación con esa carpeta termina en no_disponible sin registro: se puede elegir otra', activada.estado === 'no_disponible' && activada.registro === null, activada.estado);
}

/* ── Web: el espacio libre de la carpeta del ordenador es desconocido (no la cuota del origen) ── */
{
  globalThis.indexedDB = {};
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { storage: { estimate: async () => ({ quota: 1000, usage: 400 }) } } });
  globalThis.showDirectoryPicker = async () => {
    throw new Error('no usado en esta prueba');
  };
  const web = await importarFuente('services/almacenLocal/ubicacion.web.ts');
  const puertoWeb = web.puertoDeUbicacionDelDispositivo;
  const libreEnLaCarpeta = await puertoWeb?.puertoDeArchivos('idb:carpeta/WEE').espacioLibre();
  check('W-espacio) carpeta del ordenador: el espacio libre es desconocido (null), no la cuota del origen (600)',
    puertoWeb?.plataforma === 'web-carpeta' && libreEnLaCarpeta === null, `${puertoWeb?.plataforma}/${libreEnLaCarpeta}`);
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
