/*
 * LOS ENCARGOS DEL PERSONAJE A WEË AI (decisión del dueño, 2026-11-22): imagen,
 * vídeo y búsqueda, cobrados APARTE a la cuenta del dueño, dentro de su tope diario.
 *
 *  A · presupuesto: tope diario elegido por el dueño (0 = nada), topes por bloque, devolver;
 *  B · quién decide: la tabla de niveles para imagen y vídeo; la búsqueda, sola;
 *  C · un encargo de medio de punta a punta: cobra, genera, completa y publica; sin saldo,
 *      con fallo del motor o sin presupuesto, publica SOLO el texto y no se queda el dinero;
 *  D · la búsqueda: cobra, busca y completa; si falla, reembolsa;
 *  E · el personaje pide encargos: leerlos, buscar al responder, imagen/vídeo al publicar,
 *      aprobación según el nivel, y aprobar un borrador con medio;
 *  F · reglas del repo.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const E = require(path.resolve(here, '../lib/personajes/encargos.js'));
const A = require(path.resolve(here, '../lib/personajes/acciones.js'));
const Sv = require(path.resolve(here, '../lib/personajes/servidor.js'));
const P = require(path.resolve(here, '../lib/personajes/pase.js'));
const H = P.MS_POR_HORA;

const pase = (nivel = 'alto', extra = {}) => ({ personajeId: 'hidi_jay', programadoEn: 0, bloquesProgramados: 1, bloquesCobrados: 1, msUsados: 0, tramoDesde: 0, estado: 'activa', accionesEnBloque: 0, bloqueDeLasAcciones: 0, creditosPorBloque: 30, horasPorBloque: 24, accionesPorBloque: 30, cuentaId: 'jay', nivel, actualizadoEn: 0, topeDeCreditosDeEncargos: 150, ...extra });
const ficha = (extra = {}) => ({ version: 1, nombre: 'Jay Reads', resumen: 'Escritor de fantasía', personalidad: 'Curioso', rasgos: ['curioso'], tono: 'cercano', trasfondo: 'Valdor', temas: ['libros', 'dragones'], limites: '', ejemploDeVoz: '', saludo: '', idiomas: ['es'], nivel: 'alto', ...extra });
const precio = (service, credits) => ({ service, credits, usd: credits / 100, provider: 'x', model: 'm', detail: {} });

console.log('\n── A · Presupuesto ──');
{
  check('sin tope elegido (0) no puede encargar nada: falla cerrado', E.puedeEncargar(pase('alto', { topeDeCreditosDeEncargos: undefined }), 'imagen', 3, H).motivo === 'noPermitido');
  check('un tope inventado cuenta como 0', E.topeDeCreditosValido(999) === 0 && E.topeDeCreditosValido(150) === 150);
  check('con tope y pase vivo, sí', E.puedeEncargar(pase(), 'imagen', 3, H).ok);
  check('sin pase vivo, no', E.puedeEncargar(pase('alto', { estado: 'apagada' }), 'imagen', 3, H).motivo === 'sinPase');
  let e = pase();
  e = E.registrarEncargo(e, 'imagen', 3, H); e = E.registrarEncargo(e, 'imagen', 3, H);
  check('como mucho 2 imágenes por día', E.puedeEncargar(e, 'imagen', 3, H).motivo === 'tope');
  check('el tope de Credits del día manda: un vídeo de 160 no cabe en 150', E.puedeEncargar(pase(), 'video', 160, H).motivo === 'topeDeCreditos');
  const conVideo = E.registrarEncargo(pase('alto', { topeDeCreditosDeEncargos: 400 }), 'video', 160, H);
  check('con 400 cabe un vídeo, y solo uno por día', conVideo.creditosDeEncargosEnBloque === 160 && E.puedeEncargar(conVideo, 'video', 160, H).motivo === 'tope');
  const d = E.devolverEncargo(conVideo, 'video', 160, 0, H);
  check('devolver libera el presupuesto', d.creditosDeEncargosEnBloque === 0 && d.encargosEnBloque.video === 0);
  check('el día siguiente se reinicia', E.puedeEncargar({ ...E.registrarEncargo(e, 'imagen', 3, H), bloquesProgramados: 2, bloquesCobrados: 2 }, 'imagen', 3, 25 * H).ok);
  check('5 búsquedas por día', (() => { let x = pase(); for (let i = 0; i < 5; i++) x = E.registrarEncargo(x, 'busqueda', 3, H); return E.puedeEncargar(x, 'busqueda', 3, H).motivo === 'tope'; })());
}

console.log('\n── B · Quién decide ──');
{
  check('imagen: aprobación en Semiautomático; sola en Automático', E.decisionDelEncargo('basico', 'imagen') === 'aprobacion' && E.decisionDelEncargo('alto', 'imagen') === 'automatica');
  check('vídeo: aprobación en Semiautomático; solo en Automático', E.decisionDelEncargo('basico', 'video') === 'aprobacion' && E.decisionDelEncargo('alto', 'video') === 'automatica');
  check('búsqueda: sola en los tres (dentro del tope de Credits)', ['basico', 'alto'].every((n) => E.decisionDelEncargo(n, 'busqueda') === 'automatica'));
}

console.log('\n── C · Un encargo de medio, de punta a punta ──');
{
  const mk = ({ reserva = { ok: true, bloque: 0 }, saldo = true, falla = false } = {}) => {
    const log = { cobros: [], completados: [], reembolsos: [], devueltos: 0, publicados: [], registros: [], catalogados: 0 };
    const deps = {
      ahora: () => H,
      cotizar: async (tipo) => precio(tipo === 'video' ? 'ai_video' : 'ai_image_lite', tipo === 'video' ? 160 : 3),
      reservar: async () => reserva,
      devolverReserva: async () => { log.devueltos++; },
      cobrar: async (c, r, p) => { log.cobros.push({ c, r, credits: p.credits }); return saldo ? 'cobrado' : 'sinSaldo'; },
      completar: async (c, r, n) => { log.completados.push({ c, r, n }); },
      reembolsar: async (c, r) => { log.reembolsos.push(r); },
      generar: async () => { if (falla) throw new Error('caído'); return { url: 'https://x/img.png', generationId: 'g1', demo: false }; },
      publicar: async (perfil, texto, docId, medio) => { log.publicados.push({ texto, docId, medio }); return true; },
      registrar: async (p, e) => { log.registros.push(e); },
      catalogar: async () => { log.catalogados++; },
    };
    return { deps, log };
  };
  const enc = { perfilId: 'hidi_jay', cuentaId: 'jay', tipo: 'imagen', descripcion: 'un dragón leyendo', texto: 'Hoy leí con mi dragón', origen: 'personaje', estado: 'pendiente', creadoEn: 0 };
  let { deps, log } = mk();
  check('cobra a la cuenta del dueño, genera, completa y publica con la imagen', (await E.ejecutarEncargoDeMedio(deps, 'e1', enc)) === 'hecho' && log.cobros[0].c === 'jay' && log.completados.length === 1 && log.publicados[0].medio?.url === 'https://x/img.png' && log.publicados[0].medio.tipo === 'imagen');
  check('id fijo del cobro y de la publicación (repetir no cobra ni publica dos veces)', log.cobros[0].r === 'personaje_encargo_e1' && log.publicados[0].docId === 'autonomo_encargo_e1');
  check('lo generado queda en «Mis creaciones» de la cuenta', log.catalogados === 1);
  ({ deps, log } = mk({ saldo: false }));
  check('sin saldo: no se cobra, se devuelve el presupuesto y sale solo el texto', (await E.ejecutarEncargoDeMedio(deps, 'e2', enc)) === 'sinMedio' && log.completados.length === 0 && log.devueltos === 1 && !log.publicados[0].medio);
  ({ deps, log } = mk({ falla: true }));
  check('si el motor falla: reembolso, presupuesto devuelto y solo el texto', (await E.ejecutarEncargoDeMedio(deps, 'e3', enc)) === 'sinMedio' && log.reembolsos[0] === 'personaje_encargo_e3' && log.devueltos === 1 && log.completados.length === 0);
  ({ deps, log } = mk({ reserva: { ok: false, motivo: 'topeDeCreditos' } }));
  check('sin presupuesto del día: ni se cobra; sale solo el texto', (await E.ejecutarEncargoDeMedio(deps, 'e4', enc)) === 'sinMedio' && log.cobros.length === 0 && log.registros[0].motivo === 'topeDeCreditos');
  ({ deps, log } = mk());
  await E.ejecutarEncargoDeMedio(deps, 'e5', { ...enc, tipo: 'video' });
  check('un vídeo se publica como vídeo', log.publicados[0].medio?.tipo === 'video');
  const Pub = require(path.resolve(here, '../lib/personajes/publicar.js'));
  const conImagen = Pub.datosDePublicacion('hidi_jay', 't', { tipo: 'imagen', url: 'u' });
  const conVideo = Pub.datosDePublicacion('hidi_jay', 't', { tipo: 'video', url: 'v' });
  check('la publicación lleva la imagen, o el vídeo como Weël, y sigue marcada «Personaje con IA»', conImagen.imageUrls[0] === 'u' && conVideo.videoUrl === 'v' && conVideo.isWeel === true && conImagen.autonomo === true);
}

console.log('\n── D · La búsqueda ──');
{
  const mk = ({ falla = false, reserva = { ok: true, bloque: 0 } } = {}) => {
    const log = { completados: 0, reembolsos: 0, devueltos: 0 };
    const deps = {
      cotizar: async () => precio('ai_search', 3),
      reservar: async () => reserva,
      devolverReserva: async () => { log.devueltos++; },
      cobrar: async () => 'cobrado',
      completar: async () => { log.completados++; },
      reembolsar: async () => { log.reembolsos++; },
      buscar: async () => { if (falla) throw new Error('x'); return '{"respuesta":"Ayer salió la secuela.","delicado":null}'; },
    };
    return { deps, log };
  };
  let { deps, log } = mk();
  const r = await E.buscarComoPersonaje(deps, 'hidi_jay', 'jay', 's', 'p', [], 'b1');
  check('cobra ai_search, busca y completa', r?.creditos === 3 && log.completados === 1);
  ({ deps, log } = mk({ falla: true }));
  check('si falla, reembolsa y devuelve el presupuesto', (await E.buscarComoPersonaje(deps, 'hidi_jay', 'jay', 's', 'p', [], 'b2')) === null && log.reembolsos === 1 && log.devueltos === 1);
  ({ deps, log } = mk({ reserva: { ok: false, motivo: 'noPermitido' } }));
  check('sin permiso del dueño, ni se cobra', (await E.buscarComoPersonaje(deps, 'hidi_jay', 'jay', 's', 'p', [], 'b3')) === null && log.completados === 0);
}

console.log('\n── E · El personaje pide encargos ──');
{
  const r = A.interpretarRespuestaDelPersonaje('{"respuesta":"Mira mi dragón","delicado":null,"imagen":"un dragón azul leyendo"}');
  check('lee la imagen que pide', r.imagen === 'un dragón azul leyendo');
  check('pedir una búsqueda puede venir sin respuesta', A.interpretarRespuestaDelPersonaje('{"respuesta":"","buscar":"secuela de Valdor 2026"}')?.buscar === 'secuela de Valdor 2026');

  const mkResp = ({ tope = 150, buscar = true } = {}) => {
    const log = { buscadas: [], sistemas: [] };
    const deps = {
      ahora: () => H, estadoDe: async () => null,
      reservar: async () => pase('alto', { topeDeCreditosDeEncargos: tope }),
      devolver: async () => {}, fichaDe: async () => ficha(),
      pensar: async (c, system) => { log.sistemas.push(system); return '{"respuesta":"","buscar":"estreno"}'; },
      recuerdos: async () => [], material: async () => [], recordar: async () => {},
      avisarAlDueno: async () => {}, registrar: async () => {},
      ...(buscar ? { buscar: async (p, c, s, pr, h, id) => { log.buscadas.push({ c, id }); return { texto: '{"respuesta":"Se estrena el viernes.","delicado":null}', creditos: 3 }; } } : {}),
    };
    return { deps, log };
  };
  let { deps, log } = mkResp();
  const resp = await A.pensarRespuesta(deps, 'hidi_jay', 'wtResponder', 'weetalk', { texto: '¿cuándo se estrena?', deQuien: 'ana', historial: [], requestId: 'q1' });
  check('al responder, si hace falta, busca (encargo a la cuenta del dueño) y contesta con lo encontrado', resp?.texto === 'Se estrena el viernes.' && log.buscadas[0].c === 'jay' && log.buscadas[0].id === 'q1_busqueda');
  check('el personaje sabe que puede buscar y que cuesta', /buscar/.test(log.sistemas[0]) && /cuesta Credits/.test(log.sistemas[0]));
  ({ deps, log } = mkResp({ tope: 0 }));
  await A.pensarRespuesta(deps, 'hidi_jay', 'wtResponder', 'weetalk', { texto: '¿cuándo?', deQuien: 'ana', historial: [], requestId: 'q2' });
  check('sin tope de encargos, ni se le ofrece buscar ni se busca', log.buscadas.length === 0 && !/"buscar"/.test(log.sistemas[0]));

  const mkPub = (nivel, respuesta, tope = 150) => {
    const log = { borradores: [], encargos: [], publicadas: [], prompt: '' };
    const deps = {
      ahora: () => H,
      reservar: async () => pase(nivel, { topeDeCreditosDeEncargos: tope }),
      devolver: async () => {}, fichaDe: async () => ficha({ nivel }),
      pensar: async (c, s) => { log.prompt = s; return respuesta; },
      recuerdos: async () => [], material: async () => [],
      hayBorradorPendiente: async () => false,
      crearBorrador: async (id, texto, medio) => { log.borradores.push({ texto, medio }); },
      publicar: async (id, texto) => { log.publicadas.push(texto); return true; },
      encargar: async (id, cuenta, encId, medio, texto) => { log.encargos.push({ cuenta, encId, medio, texto }); return true; },
      anotarPublicacion: async () => {}, registrar: async () => {},
    };
    return { deps, log };
  };
  const conImg = '{"respuesta":"Mi dragón hoy","delicado":null,"imagen":"dragón azul"}';
  const conVid = '{"respuesta":"Mi dragón vuela","delicado":null,"video":"dragón volando"}';
  let p = mkPub('alto', conVid);
  check('nivel alto: encarga el vídeo y publica cuando esté listo', (await A.accionPropia(p.deps, pase('alto', { topeDeCreditosDeEncargos: 400 }))) === 'publicada' && p.log.encargos[0]?.medio.tipo === 'video' && p.log.encargos[0].cuenta === 'jay' && p.log.publicadas.length === 0);
  check('el prompt le ofrece imagen o vídeo y le recuerda que cuesta', /UNA imagen o UN vídeo/.test(p.log.prompt) && /cuesta Credits/.test(p.log.prompt));
  p = mkPub('basico', conVid);
  check('Semiautomático: el vídeo va a la bandeja con su descripción', (await A.accionPropia(p.deps, pase('basico'))) === 'borrador' && p.log.borradores[0].medio?.tipo === 'video' && p.log.encargos.length === 0);
  p = mkPub('alto', conImg);
  check('Automático: la imagen la encarga sola', (await A.accionPropia(p.deps, pase('alto', { topeDeCreditosDeEncargos: 400 }))) === 'publicada' && p.log.encargos[0]?.medio.tipo === 'imagen');
  p = mkPub('basico', conImg);
  check('nivel básico: todo a la bandeja, con la imagen pedida', (await A.accionPropia(p.deps, pase('basico'))) === 'borrador' && p.log.borradores[0].medio?.descripcion === 'dragón azul');
  p = mkPub('alto', conImg, 0);
  check('sin tope de encargos: no se le ofrecen medios y publica solo el texto', (await A.accionPropia(p.deps, pase('alto', { topeDeCreditosDeEncargos: 0 }))) === 'publicada' && p.log.encargos.length === 0 && p.log.publicadas.length === 1 && !/UNA imagen o UN vídeo/.test(p.log.prompt));

  const avisos = { a1: { tipo: 'aprobacion', accion: 'publicar', borrador: { texto: 'Mi dragón', medio: { tipo: 'imagen', descripcion: 'dragón' } }, estado: 'pendiente', creadoEn: 0, caducaEn: 24 * H } };
  const lg = { encargos: [], publicados: [] };
  const sdeps = {
    ahora: () => H, config: async () => ({ ...P.CONFIG_DEL_PASE_POR_DEFECTO, abierta: true }),
    leerPerfil: async () => ({ uid: 'hidi_jay', profileType: 'hidi', linkedAccountId: 'jay' }),
    leerFicha: async () => null, leerEstado: async () => pase(), guardarEstado: async () => {}, cobrar: async () => 'cobrado', weeSano: async () => true, cobroDisponible: () => true,
    leerAviso: async (p2, id) => avisos[id], marcarAviso: async () => {},
    publicar: async (p2, t) => { lg.publicados.push(t); return true; },
    encargar: async (p2, cuenta, id, medio, texto) => { lg.encargos.push({ cuenta, id, medio, texto }); return true; },
  };
  const ok = await Sv.resolverAviso(sdeps, 'jay', 'hidi_jay', 'a1', true);
  check('aprobar un borrador con imagen la encarga (cobra el encargo) en vez de publicar sin ella', ok.ok && lg.encargos[0]?.id === 'aprobado_a1' && lg.encargos[0].cuenta === 'jay' && lg.publicados.length === 0);
  const prog = await Sv.programarAutonomia({ ...sdeps, config: async () => ({ ...P.CONFIG_DEL_PASE_POR_DEFECTO, abierta: true }), leerFicha: async () => ficha(), leerEstado: async () => null, guardarEstado: async (id, e2) => { lg.guardado = e2; } }, 'jay', 'hidi_jay', 1, 150);
  check('al activar, el dueño elige el tope diario de encargos', prog.ok && lg.guardado.topeDeCreditosDeEncargos === 150);
  const prog2 = await Sv.programarAutonomia({ ...sdeps, config: async () => ({ ...P.CONFIG_DEL_PASE_POR_DEFECTO, abierta: true }), leerFicha: async () => ficha(), leerEstado: async () => null, guardarEstado: async (id, e2) => { lg.guardado = e2; } }, 'jay', 'hidi_jay', 1, 7777);
  check('un tope inventado se guarda como 0', prog2.ok && lg.guardado.topeDeCreditosDeEncargos === 0);
  const aj = await Sv.ajustarEncargos({ ...sdeps, guardarEstado: async (id, e2) => { lg.ajustado = e2; } }, 'jay', 'hidi_jay', 50);
  check('se puede cambiar el tope con el pase en marcha', aj.ok && lg.ajustado.topeDeCreditosDeEncargos === 50);
  check('y solo su dueño', !(await Sv.ajustarEncargos(sdeps, 'otro', 'hidi_jay', 50)).ok);
  const vista = Sv.vistaDelEstado(pase(), P.CONFIG_DEL_PASE_POR_DEFECTO, H);
  check('la app ve el tope, lo gastado hoy y las opciones', vista.pase.topeDeCreditosDeEncargos === 150 && vista.pase.creditosDeEncargosHoy === 0 && vista.topesDeEncargos.join(',') === '0,50,150,400');
}

console.log('\n── F · Reglas del repo ──');
{
  const src = sinComentarios(leer('functions/src/personajes/encargos.ts'));
  check('cobra con el Credit Engine de siempre: spend → complete / refund, y liquida el libro', /creditEngine\.spendCredits\(/.test(src) && /creditEngine\.completeCredits\(/.test(src) && /creditEngine\.refundCredits\(/.test(src) && /firestoreLedger\.settle\(/.test(src));
  check('precios oficiales de Weë AI (sin precios inventados)', /priceImage\(/.test(src) && /priceVideo\(/.test(src) && /priceOperation\('text\.search'/.test(src) && !/credits:\s*\d+/.test(src));
  check('el vídeo va por el Weë Video Engine (Seedance), nunca por otro', /videoEngine\.generate\(/.test(src) && !/kling|runway|veo/i.test(src));
  check('WeeTalk no se toca desde los encargos', !/messagesService|conversations/.test(src));
  check('el disparador se exporta y su colección es solo del servidor', /export \{ encargoDelPersonaje \} from '\.\/personajes\/encargos';/.test(leer('functions/src/index.ts')) && /match \/characterEncargos\/\{encargoId\} \{\s*allow read, write: if false;/.test(leer('firestore.rules')));
  check('un disparador repetido no repite el encargo (se toma en una transacción)', /estado: 'enCurso'/.test(src));
  check('esta suite está en la cadena de `npm test`', /personaje-encargos\.test\.mjs/.test(leer('functions/package.json')));
}

console.log('\nEncargos del personaje: cobrados aparte, dentro del tope del dueño, por el camino de Weë AI');
if (failures > 0) { console.error(`\n${failures} comprobación(es) fallida(s)`); process.exit(1); }
