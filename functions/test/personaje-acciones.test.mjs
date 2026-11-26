/*
 * LAS ACCIONES DEL PERSONAJE (paso 2B-3): responder en WeeTalk y en comentarios.
 *
 *  A · leer la respuesta del modelo con desconfianza (JSON, texto suelto, casos delicados);
 *  B · cuándo NO contestar: bucles entre personajes, IA, efímeros, ver-una-vez, no-texto;
 *  C · el historial que ve el modelo;
 *  D · reservar acción: nivel, pase y tope;
 *  E · de punta a punta con dependencias de mentira: reservar, pensar, avisar, recordar,
 *      devolver la acción si falla;
 *  F · reglas del repo: prompt en su sitio, embudo único, mismo modelo que Brain, puerta
 *      cerrada sin lecturas, marca `autonomo`, WeeTalk intacto, reglas de bandeja y registro.
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

const A = require(path.resolve(here, '../lib/personajes/acciones.js'));
const P = require(path.resolve(here, '../lib/personajes/pase.js'));
const H = P.MS_POR_HORA;

console.log('\n── A · Leer la respuesta del modelo ──');
{
  check('JSON correcto', JSON.stringify(A.interpretarRespuestaDelPersonaje('{"respuesta":"¡Hola! Mi libro trata de dragones.","delicado":null}')) === JSON.stringify({ respuesta: '¡Hola! Mi libro trata de dragones.', delicado: null }));
  check('JSON dentro de un bloque de código', A.interpretarRespuestaDelPersonaje('```json\n{"respuesta":"Hola","delicado":null}\n```').respuesta === 'Hola');
  check('un caso delicado conocido se marca', A.interpretarRespuestaDelPersonaje('{"respuesta":"Eso lo ve mi creador.","delicado":"dinero_o_pagos"}').delicado === 'dinero_o_pagos');
  check('un caso delicado inventado se ignora', A.interpretarRespuestaDelPersonaje('{"respuesta":"x","delicado":"otro"}').delicado === null);
  check('si no es JSON, se usa el texto tal cual', A.interpretarRespuestaDelPersonaje('Hola, ¿qué tal?').respuesta === 'Hola, ¿qué tal?');
  check('vacío: no hay nada que decir', A.interpretarRespuestaDelPersonaje('   ') === null && A.interpretarRespuestaDelPersonaje('{"respuesta":"  "}') === null);
  check('una respuesta larguísima se corta', A.interpretarRespuestaDelPersonaje('x'.repeat(5000)).respuesta.length === A.MAX_CARACTERES_DE_RESPUESTA);
}

console.log('\n── B · Cuándo NO contestar ──');
{
  const base = { senderId: 'ana', content: 'Hola Jay, ¿de qué trata tu libro?', type: 'text' };
  check('un mensaje normal de una persona: sí', A.debeResponder(base, 'hidi_jay'));
  check('su propio mensaje: no', !A.debeResponder({ ...base, senderId: 'hidi_jay' }, 'hidi_jay'));
  check('un mensaje escrito por IA: no', !A.debeResponder({ ...base, autonomo: true }, 'hidi_jay'));
  check('efímero o de ver una vez: no (privacidad)', !A.debeResponder({ ...base, ephemeral: true }, 'hidi_jay') && !A.debeResponder({ ...base, viewOnce: true }, 'hidi_jay'));
  check('foto, audio o texto vacío: no', !A.debeResponder({ ...base, type: 'image' }, 'hidi_jay') && !A.debeResponder({ ...base, content: '  ' }, 'hidi_jay'));
  /*
   * NO-BUCLE POR EL MENSAJE (F1 del plan de alter egos, 2026-11-23). Lina tiene el pase activo; si su dueño escribe
   * A MANO como Lina, Jay contesta. Si lo escribió la IA de Lina (`autonomo: true`, solo del servidor), Jay calla.
   */
  const deLina = { senderId: 'hidi_lina', content: 'Jay, ¿ensayamos la escena?', type: 'text' };
  check('F1) el dueño escribe a mano como un personaje con pase: el otro personaje SÍ contesta', A.debeResponder(deLina, 'hidi_jay'));
  check('F1) lo mismo escrito por la IA de ese personaje: NO (sin bucles)', !A.debeResponder({ ...deLina, autonomo: true }, 'hidi_jay'));
  check('F1) la decisión ya no depende del pase de quien envía (sin tercer argumento)', A.debeResponder.length === 2);
  const fuente = sinComentarios(leer('functions/src/personajes/acciones.ts'));
  // F5: los dos disparadores pasan por `personajesQueResponden`, que filtra con `debeResponder` antes de leer pases.
  check('F1) los disparadores ya no consultan el pase del remitente', !/esPersonajeAutonomo/.test(fuente) && /\.filter\(\(p\) => debeResponder\(m, p\)\)/.test(fuente) && (fuente.match(/personajesQueResponden\(m, /g) || []).length === 2);
}

/*
 * F5 DEL PLAN DE ALTER EGOS (2026-11-23): quién es un personaje lo dice su pase LEÍDO (`characterAutonomy/{id}`), no
 * su prefijo. Una cuenta con Lina (heredada, `hidi_…`) y Jay (alter ego opaco, `ent_…`), los dos con pase.
 */
console.log('\n── B2 · F5: personajes por su pase, no por su prefijo ──');
{
  const paseDe = (id, extra = {}) => ({ personajeId: id, programadoEn: 0, bloquesProgramados: 1, bloquesCobrados: 1, msUsados: 0, tramoDesde: 0, estado: 'activa', accionesEnBloque: 0, bloqueDeLasAcciones: 0, creditosPorBloque: 30, horasPorBloque: 24, accionesPorBloque: 30, cuentaId: 'cuenta1', nivel: 'basico', actualizadoEn: 0, ...extra });
  const pases = { hidi_lina: paseDe('hidi_lina'), ent_jay00001: paseDe('ent_jay00001'), ent_apagado1: paseDe('ent_apagado1', { estado: 'terminada' }), ent_cruzado1: paseDe('otro') };
  const leidos = [];
  const leer2 = async (ids) => { leidos.push(...ids); return ids.map((id) => pases[id] ?? null); };
  const aMano = { senderId: 'hidi_lina', content: 'Jay, ¿ensayamos la escena?', type: 'text' };
  check('F5) el dueño escribe A MANO como Lina a Jay (alter ego `ent_` con pase): Jay responde', JSON.stringify(await A.personajesQueResponden(aMano, ['hidi_lina', 'ent_jay00001'], leer2)) === JSON.stringify(['ent_jay00001']));
  leidos.length = 0;
  check('F5) Lina escribe con IA (`autonomo: true`): Jay NO responde, y no se lee ningún pase', (await A.personajesQueResponden({ ...aMano, autonomo: true }, ['hidi_lina', 'ent_jay00001'], leer2)).length === 0 && leidos.length === 0);
  const deJay = { senderId: 'ent_jay00001', content: 'Lina, ¿y si cambiamos el final?', type: 'text' };
  check('F5) al revés, igual: el heredado con pase contesta al alter ego escrito a mano', JSON.stringify(await A.personajesQueResponden(deJay, ['hidi_lina', 'ent_jay00001'], leer2)) === JSON.stringify(['hidi_lina']));
  check('F5) una persona cualquiera (sin pase) no «responde», tenga el id que tenga', (await A.personajesQueResponden({ ...aMano, senderId: 'ana' }, ['ana', 'hidi_sinpase', 'ent_sinpase1'], leer2)).length === 0);
  check('F5) un pase apagado o terminado no contesta', (await A.personajesQueResponden(aMano, ['ent_apagado1'], leer2)).length === 0);
  check('F5) un pase que no es de ese perfil no vale (personajeId cruzado)', (await A.personajesQueResponden(aMano, ['ent_cruzado1'], leer2)).length === 0);
  check('F5) ids raros o repetidos no se leen', (leidos.length = 0, (await A.personajesQueResponden(aMano, ['ent_jay00001', 'ent_jay00001', '', 'a/b', 7, null], leer2)).length === 1 && leidos.length === 1));
  const fuente = sinComentarios(leer('functions/src/personajes/acciones.ts'));
  check('F5) ningún prefijo decide quién es personaje en las acciones', !/startsWith\(/.test(fuente) && !/hidi_/.test(fuente));
  check('F5) los pases se leen de `characterAutonomy` en una lectura agrupada', /getAll\(\.\.\.ids\.map\(\(id\) => db\(\)\.collection\(COLECCION_DE_AUTONOMIA\)\.doc\(id\)\)\)/.test(fuente));
  check('F5) con la puerta cerrada no se lee nada (la puerta va antes de cualquier lectura en los dos disparadores)',
    /personajeRespondeWeeTalk = onDocumentCreated\(\{[^\n]*?\}, async \(event\) => \{\s*if \(!\(await configDelPaseViva\(\)\)\.abierta\) return;/.test(fuente)
    && /personajeRespondeComentario = onDocumentCreated\(\{[^\n]*?\}, async \(event\) => \{\s*if \(!\(await configDelPaseViva\(\)\)\.abierta\) return;/.test(fuente));
}

console.log('\n── C · El historial ──');
{
  const h = A.historialDeConversacion([{ senderId: 'ana', content: 'hola' }, { senderId: 'hidi_jay', content: 'hola, Ana' }, { senderId: 'ana', content: 'foto', type: 'image' }, { senderId: 'ana', content: 'secreto', ephemeral: true }], 'hidi_jay');
  check('el personaje es «assistant» y la persona «user»', h.length === 2 && h[0].role === 'user' && h[1].role === 'assistant');
  check('sin fotos ni mensajes efímeros', !h.some((x) => x.content === 'foto' || x.content === 'secreto'));
  check('como mucho los últimos 12', A.historialDeConversacion(Array.from({ length: 40 }, (_, i) => ({ senderId: 'ana', content: `m${i}` })), 'hidi_jay').length === A.MENSAJES_DE_CONTEXTO);
}

const pase = (nivel = 'basico', acciones = 0) => ({ personajeId: 'hidi_jay', programadoEn: 0, bloquesProgramados: 1, bloquesCobrados: 1, msUsados: 0, tramoDesde: 0, estado: 'activa', accionesEnBloque: acciones, bloqueDeLasAcciones: 0, creditosPorBloque: 30, horasPorBloque: 24, accionesPorBloque: 30, cuentaId: 'jay', nivel, actualizadoEn: 0 });

console.log('\n── D · Reservar una acción ──');
{
  const r = A.reservarAccion(pase(), 'wtResponder', H);
  check('responder en WeeTalk en nivel básico: se reserva y se cuenta', r.ok && r.estado.accionesEnBloque === 1);
  check('publicar en nivel básico pide aprobación: no se reserva', A.reservarAccion(pase('basico'), 'publicar', H).motivo === 'requiereAprobacion');
  check('en modo Automático, publicar sí', A.reservarAccion(pase('alto'), 'publicar', H).ok);
  check('con el tope alcanzado, no', A.reservarAccion(pase('alto', 30), 'wtResponder', H).ok === false);
  check('sin el bloque pagado, no', A.reservarAccion({ ...pase(), bloquesCobrados: 0 }, 'wtResponder', H).motivo === 'bloqueSinPagar');
  check('apagado, no', A.reservarAccion({ ...pase(), estado: 'apagada' }, 'wtResponder', H).ok === false);
}

console.log('\n── D2 · Endurecimiento: tope por persona, devolver y duplicados ──');
{
  let e = pase('alto');
  for (let i = 0; i < A.MAX_RESPUESTAS_POR_PERSONA; i++) { const r = A.reservarAccion(e, 'wtResponder', H, 'ana'); e = r.estado; }
  check('una misma persona no puede gastar más de 10 respuestas por día del personaje', A.reservarAccion(e, 'wtResponder', H, 'ana').motivo === 'topePorPersona');
  check('pero otra persona sí puede escribirle', A.reservarAccion(e, 'wtResponder', H, 'beto').ok);
  const otroDia = A.reservarAccion({ ...e, bloquesProgramados: 2, bloquesCobrados: 2 }, 'wtResponder', 25 * H, 'ana');
  check('el contador por persona se reinicia en el día siguiente', otroDia.ok && otroDia.estado.porInterlocutor.ana === 1);
  const topeado = { ...pase('alto', 30), estado: 'pausadaPorTope', motivo: 'tope', porInterlocutor: { ana: 3 } };
  const d = A.devolverAccion(topeado, 'ana', H);
  check('devolver la acción que llegó al tope levanta la pausa por tope', d.accionesEnBloque === 29 && d.estado === 'activa' && d.porInterlocutor.ana === 2);
  check('devolver nunca deja el contador en negativo', A.devolverAccion(pase('alto', 0), 'ana', H).accionesEnBloque === 0);
  check('la respuesta a un mensaje tiene un id fijo (un disparador repetido no contesta dos veces)', A.idDeRespuesta('m1', 'hidi_jay') === A.idDeRespuesta('m1', 'hidi_jay') && A.idDeRespuesta('m1', 'hidi_jay') !== A.idDeRespuesta('m2', 'hidi_jay'));
  const acc = leer('functions/src/personajes/acciones.ts');
  check('se escribe con `create` (falla si ya existe) y se devuelve la acción si otra ejecución ganó', /await ref\.create\(datos\)/.test(acc) && /code === 6/.test(acc) && (acc.match(/crearUnaVez\(respuestaRef/g) || []).length === 2);
  check('antes de pensar, se mira si ya hay respuesta (no se gasta IA dos veces)', /if \(\(await respuestaRef\.get\(\)\)\.exists\) continue;/.test(acc) && /doc\(idDeRespuesta\(event\.params\.comentarioId, perfilId\)\)\.get\(\)\)\.exists\) return;/.test(acc));
  check('el historial quita el mensaje actual por su id, no por su posición', /filter\(\(d\) => d\.id !== mensajeId\)/.test(acc));
  check('reservar y devolver son transacciones', /reservar: async \(id, accion, deQuien\) => db\(\)\.runTransaction/.test(acc) && /devolver: async \(id, deQuien\) => \{\s*await db\(\)\.runTransaction/.test(acc));
  check('el ciclo programado pone al día cada pase dentro de una transacción', /await db\(\)\.runTransaction\(async \(tx\) => \{\s*const fresco = await tx\.get\(doc\.ref\);/.test(leer('functions/src/personajes/ciclo.ts')));
}

console.log('\n── D3 · Publicar por iniciativa propia ──');
{
  const Pub = require(path.resolve(here, '../lib/personajes/publicar.js'));
  const datos = Pub.datosDePublicacion('hidi_jay', 'Hola, mundo de Valdor');
  check('la publicación tiene los campos de una de la app, a nombre del personaje y marcada', datos.userId === 'hidi_jay' && datos.content === 'Hola, mundo de Valdor' && datos.isPrivate === false && datos.likes === 0 && datos.comments === 0 && Array.isArray(datos.imageUrls) && datos.autonomo === true);
  const e0 = pase('alto');
  check('con el pase vivo le toca publicar', A.tocaPublicar(e0, H));
  const e1 = A.registrarPublicacion(e0, H);
  check('después de publicar, no vuelve a publicar antes de 6 horas', !A.tocaPublicar(e1, 2 * H) && A.tocaPublicar(e1, 7 * H));
  const e2 = A.registrarPublicacion(e1, 7 * H);
  check('como mucho 2 publicaciones propias por día', !A.tocaPublicar(e2, 20 * H));
  check('el día siguiente vuelve a tener cupo', A.tocaPublicar({ ...e2, bloquesProgramados: 2, bloquesCobrados: 2 }, 25 * H));
  check('con el pase apagado, no publica', !A.tocaPublicar({ ...e0, estado: 'apagada' }, H));

  const mkPub = (nivel, respuesta, { pendiente = false } = {}) => {
    const log = { reservas: 0, devueltas: 0, borradores: [], publicadas: [], anotadas: 0, pensado: null };
    const deps = {
      ahora: () => H,
      reservar: async () => { log.reservas++; return pase(nivel); },
      devolver: async () => { log.devueltas++; },
      fichaDe: async () => ({ version: 1, nombre: 'Jay Reads', resumen: 'Escritor', personalidad: 'Curioso', rasgos: ['curioso'], tono: 'cercano', trasfondo: 'Valdor', temas: ['libros'], limites: '', ejemploDeVoz: '', saludo: '', idiomas: [], nivel }),
      pensar: async (c, system) => { log.pensado = system; return respuesta; },
      recuerdos: async () => [],
      material: async () => [],
      hayBorradorPendiente: async () => pendiente,
      crearBorrador: async (id, texto) => { log.borradores.push(texto); },
      publicar: async (id, texto, docId) => { log.publicadas.push({ texto, docId }); return true; },
      anotarPublicacion: async () => { log.anotadas++; },
      registrar: async () => {},
    };
    return { deps, log };
  };
  let { deps, log } = mkPub('basico', '{"respuesta":"Hoy escribí sobre el reino de Valdor.","delicado":null}');
  check('nivel básico: deja un BORRADOR para su dueño, no publica', (await A.accionPropia(deps, pase('basico'))) === 'borrador' && log.borradores.length === 1 && log.publicadas.length === 0 && log.anotadas === 1);
  check('el prompt de la publicación prohíbe dinero, datos del dueño y hacerse pasar por persona', /dinero/.test(log.pensado) && /datos personales de tu dueño/.test(log.pensado) && /No te hagas pasar por una persona real/.test(log.pensado));
  ({ deps, log } = mkPub('basico', 'x', { pendiente: true }));
  check('si ya hay un borrador esperando, no se amontona otro (ni se gasta IA)', (await A.accionPropia(deps, pase('basico'))) === 'nada' && log.reservas === 0);
  ({ deps, log } = mkPub('alto', '{"respuesta":"Nuevo capítulo en camino.","delicado":null}'));
  check('nivel alto: publica directamente, con id fijo', (await A.accionPropia(deps, pase('alto'))) === 'publicada' && log.publicadas.length === 1 && /^autonomo_personaje_pub_/.test(log.publicadas[0].docId));
  ({ deps, log } = mkPub('alto', '{"respuesta":"Compren mi libro","delicado":"dinero_o_pagos"}'));
  check('si el texto toca algo delicado, no se publica y la acción se devuelve', (await A.accionPropia(deps, pase('alto'))) === 'nada' && log.publicadas.length === 0 && log.devueltas === 1);
  ({ deps, log } = mkPub('alto', 'x'));
  check('si no le toca (acaba de publicar), no hace nada', (await A.accionPropia(deps, A.registrarPublicacion(pase('alto'), H))) === 'nada' && log.reservas === 0);
}

console.log('\n── E · De punta a punta, sin red ──');
{
  const mk = (respuestaDelModelo, { reservaOk = true, fallar = false } = {}) => {
    const log = { reservas: 0, devueltas: 0, avisos: [], recuerdos: [], registros: [], pensado: null };
    const deps = {
      ahora: () => 1000,
      estadoDe: async () => pase(),
      reservar: async () => { if (!reservaOk) return null; log.reservas++; return pase(); },
      devolver: async () => { log.devueltas++; },
      fichaDe: async () => ({ version: 1, nombre: 'Jay Reads', resumen: 'Escritor', personalidad: 'Curioso', rasgos: ['curioso'], tono: 'cercano', trasfondo: 'El reino de Valdor', temas: ['libros'], limites: 'No habla de política', ejemploDeVoz: '', saludo: '', idiomas: [], nivel: 'basico' }),
      pensar: async (cuenta, system, prompt, history, requestId) => { if (fallar) throw new Error('caída'); log.pensado = { cuenta, system, prompt, history, requestId }; return respuestaDelModelo; },
      recuerdos: async () => ['Ana me preguntó antes por los dragones'],
      material: async () => [],
      recordar: async (id, cuenta, texto) => { log.recuerdos.push({ cuenta, texto }); },
      avisarAlDueno: async (id, tipo, detalle) => { log.avisos.push(detalle); },
      registrar: async (id, e) => { log.registros.push(e); },
    };
    return { deps, log };
  };
  let { deps, log } = mk('{"respuesta":"¡Hola Ana! Mi libro cuenta el nacimiento del reino de Valdor.","delicado":null}');
  const r = await A.pensarRespuesta(deps, 'hidi_jay', 'wtResponder', 'weetalk', { texto: 'Cuéntame de tu libro', deQuien: 'ana', historial: [], requestId: 'req1' });
  check('contesta como el personaje', r.texto.includes('Valdor') && r.delicado === null);
  check('piensa con la cuenta dueña (paga el pase), con la ficha como dato y sus recuerdos', log.pensado.cuenta === 'jay' && /<ficha_del_personaje>/.test(log.pensado.system) && /dragones/.test(log.pensado.system));
  check('las reglas de seguridad van en el sistema (IA declarada, sin dinero, sin datos del dueño)', /personaje con IA/.test(log.pensado.system) && /dinero/.test(log.pensado.system) && /datos personales de tu dueño/.test(log.pensado.system));
  check('recuerda la conversación a nombre de la cuenta dueña y lo registra', log.recuerdos.length === 1 && log.recuerdos[0].cuenta === 'jay' && log.registros.length === 1 && log.devueltas === 0);

  ({ deps, log } = mk('{"respuesta":"Eso lo tiene que ver mi creador.","delicado":"encuentros_o_contacto_fuera"}'));
  const d = await A.pensarRespuesta(deps, 'hidi_jay', 'wtResponder', 'weetalk', { texto: '¿Nos vemos mañana en persona?', deQuien: 'ana', historial: [], requestId: 'req2' });
  check('lo delicado: contesta con una evasiva y avisa al dueño', d.delicado === 'encuentros_o_contacto_fuera' && log.avisos.length === 1 && log.avisos[0].caso === 'encuentros_o_contacto_fuera');

  ({ deps, log } = mk('x', { reservaOk: false }));
  check('sin pase o sin cupo: no piensa nada (no gasta)', (await A.pensarRespuesta(deps, 'hidi_jay', 'wtResponder', 'weetalk', { texto: 'hola', deQuien: 'ana', historial: [], requestId: 'r3' })) === null && log.pensado === null);

  ({ deps, log } = mk('x', { fallar: true }));
  let fallo = ''; try { await A.pensarRespuesta(deps, 'hidi_jay', 'wtResponder', 'weetalk', { texto: 'hola', deQuien: 'ana', historial: [], requestId: 'r4' }); } catch (e) { fallo = e.message; }
  check('si la IA falla, la acción reservada se devuelve', fallo === 'caída' && log.devueltas === 1);
  ({ deps, log } = mk('   '));
  check('si el modelo no dice nada, no se publica y se devuelve la acción', (await A.pensarRespuesta(deps, 'hidi_jay', 'wtResponder', 'weetalk', { texto: 'hola', deQuien: 'ana', historial: [], requestId: 'r5' })) === null && log.devueltas === 1);

  // F5: un alter ego `ent_…` con pase funciona igual que el heredado; paga la cuenta guardada en SU pase (cuentaId).
  ({ deps, log } = mk('{"respuesta":"¡Hola Ana! Soy Jay, el otro.","delicado":null}'));
  const usados = [];
  const depsEnt = { ...deps, reservar: async (id) => { usados.push(id); return { ...pase(), personajeId: id }; }, fichaDe: async (id) => { usados.push(id); return deps.fichaDe(id); } };
  const rEnt = await A.pensarRespuesta(depsEnt, 'ent_jay00001', 'wtResponder', 'weetalk', { texto: 'Cuéntame de tu libro', deQuien: 'ana', historial: [], requestId: 'req-ent' });
  check('F5) un alter ego `ent_` con pase contesta igual que el heredado y paga la cuenta dueña de su pase', rEnt?.texto.includes('Jay') && log.pensado.cuenta === 'jay' && usados.every((x) => x === 'ent_jay00001') && log.recuerdos[0]?.cuenta === 'jay');
}

console.log('\n── F · Reglas del repositorio ──');
{
  const acc = leer('functions/src/personajes/acciones.ts'), pr = leer('functions/src/creator/prompts.ts');
  check('el prompt del personaje vive en creator/prompts.ts', /export const promptDeSistemaDelPersonaje/.test(pr) && !/Eres un personaje de Weë/.test(acc));
  check('entra por el embudo único del motor, con el modelo de Weë Brain pedido por su nombre', /engine\.generate\(\{/.test(acc) && /modelId: MODELO_DE_BRAIN, allowedProviders: \['deepseek'\]/.test(acc));
  check('no cobra aparte: va incluido en el pase', /creditsEstimated: 0/.test(acc) && !/spendCredits|creditEngine/.test(sinComentarios(acc)));
  check('con la puerta cerrada, los disparadores salen sin leer nada', (acc.match(/if \(!\(await configDelPaseViva\(\)\)\.abierta\) return;/g) || []).length === 2);
  check('lo que escribe lleva la marca `autonomo: true`', (acc.match(/autonomo: true/g) || []).length >= 2);
  check('el registro del embudo incluye las acciones del personaje, con su motivo', /'personajes\/acciones\.ts'/.test(leer('functions/test/runtime-map.test.mjs')) && /regla 10/.test(leer('functions/test/runtime-map.test.mjs')));
  const wt = leer('functions/src/social/weetalk.ts');
  check('WeeTalk no importa nada de personajes ni de Credits', !/personajes|credits/.test(sinComentarios(wt)));
  const reglas = leer('firestore.rules');
  check('bandeja y registro: los escribe solo el servidor; los lee el dueño', /match \/characterInbox\/\{avisoId\} \{\s*allow read: if esDuenyoDelPersonaje\(userId\);\s*allow write: if false;/.test(reglas) && /match \/characterLog\/\{entradaId\} \{\s*allow read: if esDuenyoDelPersonaje\(userId\);\s*allow write: if false;/.test(reglas));
  check('se exportan los dos disparadores', /export \{ personajeRespondeWeeTalk, personajeRespondeComentario \} from '\.\/personajes\/acciones'/.test(leer('functions/src/index.ts')));
  check('esta suite está en la cadena de `npm test`', /personaje-acciones\.test\.mjs/.test(leer('functions/package.json')));
}

console.log('\nAcciones del personaje: responder en WeeTalk y comentarios, con filtros');
if (failures > 0) { console.error(`\n${failures} comprobación(es) fallida(s)`); process.exit(1); }
