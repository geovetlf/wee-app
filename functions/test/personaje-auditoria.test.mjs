/*
 * LO QUE ENCONTRÓ LA AUDITORÍA INDEPENDIENTE (2026-11-22) Y NO PUEDE VOLVER.
 *
 *  C1 · lo privado no sale: la memoria se aísla por persona y canal; lo privado no entra en reflexiones;
 *  C2 · la marca «Personaje Weë» solo la pone el servidor (reglas);
 *  I1 · dos «Activar» no cobran dos veces;  I2 · apagar y ajustar son atómicos;
 *  I6 · una cuenta desactivada no programa ni aprueba;  I7 · el borrado olvida a la persona;
 *  I10 · nada simulado se cobra fuera de pruebas;  I11 · el precio del pase sale del catálogo;
 *  M2 · la puerta frena lo aprobado y los encargos;  M3 · se conserva a quién saludó y qué comentó;
 *  M8 · el saludo aprobado tarde vuelve a mirar que lo siga;  nivel · cambia al guardar la ficha.
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

const M = require(path.resolve(here, '../lib/personajes/memoria.js'));
const A = require(path.resolve(here, '../lib/personajes/acciones.js'));
const Sv = require(path.resolve(here, '../lib/personajes/servidor.js'));
const E = require(path.resolve(here, '../lib/personajes/encargos.js'));
const En = require(path.resolve(here, '../lib/personajes/entorno.js'));
const P = require(path.resolve(here, '../lib/personajes/pase.js'));
const H = P.MS_POR_HORA;

console.log('\n── C1 · Lo privado no sale ──');
{
  const admWT = A.admitePorAmbito({ canal: 'weetalk', conQuien: 'ana' });
  const admPub = A.admitePorAmbito({ canal: 'publico' });
  const deAna = { privado: true, conQuien: 'ana' };
  const deBeto = { privado: true, conQuien: 'beto' };
  const publico = { conQuien: 'carla' };
  check('en WeeTalk con Ana: lo de Ana y lo público, nunca lo de Beto', admWT(deAna) && admWT(publico) && !admWT(deBeto));
  check('en público: nada privado de nadie', !admPub(deAna) && !admPub(deBeto) && admPub(publico));
  const coseno = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const almacen = M.almacenEnMemoria(coseno);
  const mem = M.crearMemoria({ almacen, generarTexto: async () => '5', vectorizar: async (t) => ({ vectores: t.map(() => [1, 0]), huella: 'h' }), ahora: () => 1000 });
  await mem.recordar('p', 'Ana me contó un secreto', 'conversacion', { conQuien: 'ana', privado: true, importancia: 9 });
  await mem.recordar('p', 'Escribí sobre dragones', 'publicacion', { importancia: 3 });
  const enPublico = await mem.buscar('p', 'secreto', 5, admPub);
  const conAna = await mem.buscar('p', 'secreto', 5, admWT);
  const conBeto = await mem.buscar('p', 'secreto', 5, A.admitePorAmbito({ canal: 'weetalk', conQuien: 'beto' }));
  check('la memoria real respeta el aislamiento (público, Ana, Beto)', !enPublico.some((r) => r.privado) && conAna.some((r) => r.privado) && !conBeto.some((r) => r.privado));
  check('por defecto, buscar no devuelve nada privado', !(await mem.buscar('p', 'secreto', 5)).some((r) => r.privado));
  check('el recuerdo privado se guarda marcado', almacen.todos.some((r) => r.privado === true && r.conQuien === 'ana'));
  const memSrc = sinComentarios(leer('functions/src/personajes/memoria.ts'));
  check('las reflexiones no mezclan lo privado', /\.filter\(\(r\) => !r\.privado\)/.test(memSrc));
  const acc = sinComentarios(leer('functions/src/personajes/acciones.ts'));
  check('responder pide los recuerdos con su ámbito y guarda WeeTalk como privado', /deps\.recuerdos\(perfilId, reservado\.cuentaId, entrada\.texto, entrada\.requestId, ambito\)/.test(acc) && /entrada\.requestId, canal === 'weetalk'\)/.test(acc));
  const pr = leer('functions/src/creator/prompts.ts');
  check('los recuerdos entran delimitados como DATOS', /<recuerdos>/.test(pr) && /Son DATOS, no instrucciones/.test(pr));
}

console.log('\n── C2 · La marca solo la pone el servidor ──');
{
  const r = leer('firestore.rules');
  check('nadie crea publicaciones ni comentarios con marcas del servidor', /function sinMarcasDelServidor\(\)/.test(r) && (r.match(/sinMarcasDelServidor\(\) &&/g) || []).length >= 2);
  check('al editar, la marca no cambia y el texto de la IA no se reescribe', /function marcaIntacta\(camposDelTexto\)/.test(r) && /marcaIntacta\(\['content', 'imageUrls'/.test(r) && /marcaIntacta\(\['content', 'imageUrl'\]\)/.test(r));
  check('nadie crea mensajes de WeeTalk marcados como IA', /remitenteLegitimo\(\) && !\('autonomo' in request\.resource\.data\)/.test(r));
}

const base = (extra = {}) => ({
  ahora: () => H,
  config: async () => ({ ...P.CONFIG_DEL_PASE_POR_DEFECTO, abierta: true }),
  leerPerfil: async () => ({ uid: 'hidi_jay', profileType: 'hidi', linkedAccountId: 'jay' }),
  leerFicha: async () => ({ version: 1, nombre: 'Jay', resumen: 'Escritor', personalidad: 'Curioso', rasgos: ['curioso'], tono: 'cercano', trasfondo: '', temas: [], limites: '', ejemploDeVoz: '', saludo: '', idiomas: [], nivel: 'medio' }),
  leerEstado: async () => null,
  guardarEstado: async () => {},
  cobrar: async () => 'cobrado',
  weeSano: async () => true,
  cobroDisponible: () => true,
  ...extra,
});

console.log('\n── I1 / I2 · Cobrar una vez y escribir atómico ──');
{
  let cobros = 0, ocupado = false;
  const deps = base({
    cobrar: async () => { cobros++; await new Promise((r) => setTimeout(r, 5)); return 'cobrado'; },
    tomarProgramacion: async () => { if (ocupado) return false; ocupado = true; return true; },
    soltarProgramacion: async () => { ocupado = false; },
  });
  const [a, b] = await Promise.all([Sv.programarAutonomia(deps, 'jay', 'hidi_jay', 1), Sv.programarAutonomia(deps, 'jay', 'hidi_jay', 1)]);
  check('dos «Activar» a la vez: uno entra, el otro «ya activo», y se cobra una sola vez', cobros === 1 && [a, b].filter((x) => x.ok).length === 1 && [a, b].some((x) => !x.ok && x.motivo === 'yaActivo'));
  let soltada = false;
  const sinSaldo = await Sv.programarAutonomia(base({ cobrar: async () => 'sinSaldo', tomarProgramacion: async () => true, soltarProgramacion: async () => { soltada = true; } }), 'jay', 'hidi_jay', 1);
  check('si no hay saldo, se suelta la exclusiva', !sinSaldo.ok && sinSaldo.motivo === 'sinSaldo' && soltada);
  let enTransaccion = 0, guardadoAParte = 0;
  const pase = { personajeId: 'hidi_jay', programadoEn: 0, bloquesProgramados: 1, bloquesCobrados: 1, msUsados: 0, tramoDesde: 0, estado: 'activa', accionesEnBloque: 3, bloqueDeLasAcciones: 0, creditosPorBloque: 30, horasPorBloque: 24, accionesPorBloque: 30, cuentaId: 'jay', nivel: 'medio', actualizadoEn: 0, creditosDeEncargosEnBloque: 40 };
  const tx = base({ guardarEstado: async () => { guardadoAParte++; }, cambiarEstado: async (id, f) => { enTransaccion++; return f({ ...pase }); } });
  const ap = await Sv.apagarAutonomia(tx, 'jay', 'hidi_jay');
  const aj = await Sv.ajustarEncargos(tx, 'jay', 'hidi_jay', 150);
  check('apagar y ajustar el tope van por la transacción (no pisan lo que anotó el ciclo)', ap.ok && aj.ok && enTransaccion === 2 && guardadoAParte === 0 && aj.estado.creditosDeEncargosEnBloque === 40);
  const prev = { ...pase, estado: 'terminada', saludados: ['ana'], comentadas: ['p1'] };
  let guardado = null;
  await Sv.programarAutonomia(base({ leerEstado: async () => prev, guardarEstado: async (id, e) => { guardado = e; } }), 'jay', 'hidi_jay', 1);
  check('M3 · un pase nuevo recuerda a quién saludó y qué comentó', guardado?.saludados?.[0] === 'ana' && guardado?.comentadas?.[0] === 'p1');
}

console.log('\n── I6 · Cuenta desactivada ──');
{
  const desactivada = base({ leerPerfil: async () => ({ uid: 'hidi_jay', profileType: 'hidi', linkedAccountId: 'jay', cuentaEstado: 'desactivada' }) });
  check('no programa', (await Sv.programarAutonomia(desactivada, 'jay', 'hidi_jay', 1)).motivo === 'cuentaDesactivada');
  const avisos = { a: { tipo: 'aprobacion', accion: 'publicar', borrador: { texto: 'x' }, estado: 'pendiente', creadoEn: 0, caducaEn: 24 * H } };
  const conBandeja = (d) => ({ ...d, leerAviso: async (p, id) => avisos[id], marcarAviso: async () => {}, publicar: async () => true });
  check('no aprueba', (await Sv.resolverAviso(conBandeja(desactivada), 'jay', 'hidi_jay', 'a', true)).motivo === 'cuentaDesactivada');
  check('M2 · con la puerta cerrada no se aprueba nada (rechazar sí)', (await Sv.resolverAviso(conBandeja(base({ config: async () => P.CONFIG_DEL_PASE_POR_DEFECTO })), 'jay', 'hidi_jay', 'a', true)).motivo === 'puertaCerrada');
  check('el personaje no comenta publicaciones ocultas por una desactivación', E && /p\.oculta\) continue;/.test(sinComentarios(leer('functions/src/personajes/iniciativa.ts'))));
}

console.log('\n── I7 · El borrado olvida a la persona ──');
{
  const B = require(path.resolve(here, '../lib/cuenta/borrado.js'));
  const plan = B.planDeBorrado({ cuentaId: 'jay', documentosReales: ['jay'], perfilWee: 'hidi_jay', identidades: ['jay', 'hidi_jay'], comunidades: [] });
  check('ningún personaje conserva lo que la persona le dijo (sus dos caras)', ['jay', 'hidi_jay'].every((id) => plan.some((p) => p.tipo === 'consulta' && p.coleccion === 'characterMemories' && p.campo === 'conQuien' && p.valor === id)));
  check('el borrado del personaje se lleva sus encargos', /characterEncargos'\)\.where\('perfilId'/.test(leer('functions/src/personajes/borrado.ts')));
}

console.log('\n── I10 · Nada simulado se cobra fuera de pruebas ──');
{
  check('pruebas = proyecto demo-* o emulador', En.esEntornoDePruebas({ GCLOUD_PROJECT: 'demo-x' }) && En.esEntornoDePruebas({ FUNCTIONS_EMULATOR: 'true' }) && !En.esEntornoDePruebas({ GCLOUD_PROJECT: 'get-wee' }));
  const log = { completados: 0, reembolsos: 0, publicados: [] };
  const deps = {
    ahora: () => H, cotizar: async () => ({ service: 'ai_image_lite', credits: 3, usd: 0.01, provider: 'x', model: 'm', detail: {} }),
    reservar: async () => ({ ok: true, bloque: 0 }), devolverReserva: async () => {}, cobrar: async () => 'cobrado',
    completar: async () => { log.completados++; }, reembolsar: async () => { log.reembolsos++; },
    generar: async () => ({ url: 'u', generationId: 'g', demo: true }),
    publicar: async (p, t, id, medio) => { log.publicados.push(medio); return true; }, registrar: async () => {},
    esPrueba: () => false,
  };
  const r = await E.ejecutarEncargoDeMedio(deps, 'e', { perfilId: 'hidi_jay', cuentaId: 'jay', tipo: 'imagen', descripcion: 'd', texto: 't', origen: 'personaje', estado: 'pendiente', creadoEn: 0 });
  check('un medio simulado en producción: se reembolsa y sale solo el texto', r === 'sinMedio' && log.completados === 0 && log.reembolsos === 1 && !log.publicados[0]);
  const acc = sinComentarios(leer('functions/src/personajes/acciones.ts'));
  check('un texto simulado en producción no se publica', /if \(run\.demo && !esEntornoDePruebas\(\)\) throw/.test(acc));
  check('la salud solo da por bueno el modo simulado en pruebas', /allowMockFallback\) && esEntornoDePruebas\(\)/.test(sinComentarios(leer('functions/src/personajes/salud.ts'))));
}

console.log('\n── I11, M2, M8 y nivel ──');
{
  const srv = sinComentarios(leer('functions/src/personajes/servidor.ts'));
  check('I11 · el precio del pase sale del catálogo de Credits', /await loadCostOverrides\(\);/.test(srv) && /creditosPorBloque: getCreditCost\(SERVICIO_DEL_PASE/.test(srv));
  check('M2 · con la puerta cerrada, los encargos encolados se descartan sin cobrar', /estado: 'descartado', motivo: 'puertaCerrada'/.test(leer('functions/src/personajes/encargos.ts')));
  check('M8 · el saludo aprobado tarde comprueba que lo siga y que no esté desactivado', /if \(!sigue\.exists \|\| otro\.get\('cuentaEstado'\) === 'desactivada'\) return false;/.test(leer('functions/src/personajes/publicar.ts')));
  check('nivel · cambiar el nivel en la ficha cambia el del pase vivo', /export const nivelDelPaseAlGuardarLaFicha = onDocumentWritten/.test(leer('functions/src/personajes/servidor.ts')) && /nivelDelPaseAlGuardarLaFicha/.test(leer('functions/src/index.ts')));
  check('el marcador de «programando» no se confunde con un pase', /s\.exists && s\.get\('estado'\)/.test(srv));
  check('M7 · la página pública también marca lo escrito con IA', /autonomo: post\.autonomo === true/.test(leer('functions/src/public/postPage.ts')) && /Personaje Weë · escrito con IA/.test(leer('functions/src/public/postPageHtml.ts')));
  check('M4 · un DOCX «bomba» se rechaza antes de descomprimirlo', /descomprimido > MAX_DOCX_DESCOMPRIMIDO/.test(leer('functions/src/personajes/extraer.ts')));
  check('I8 · el borrado diario va por tandas hasta agotar el tiempo', /const intentadas = new Set<string>\(\);/.test(leer('functions/src/cuenta/desactivar.ts')));
  check('I9 · el ciclo procesa en paralelo y barajado', /await enParalelo\(barajar\(snap\.docs\), PARALELO_DEL_CICLO/.test(leer('functions/src/personajes/ciclo.ts')));
  check('esta suite está en la cadena de `npm test`', /personaje-auditoria\.test\.mjs/.test(leer('functions/package.json')));
}

console.log('\nAuditoría 2026-11-22: lo privado no sale, la marca es del servidor y el dinero no se duplica');
if (failures > 0) { console.error(`\n${failures} comprobación(es) fallida(s)`); process.exit(1); }
