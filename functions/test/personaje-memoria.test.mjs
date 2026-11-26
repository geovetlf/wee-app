/*
 * MEMORIA DE LOS PERSONAJES CON IA (paso 2A).
 *
 *  A · la importancia se lee bien de la respuesta del modelo (y nunca se sale de 0–9);
 *  B · el orden de recuerdos (relevancia + importancia + recencia) no da NaN y toca
 *      solo lo que hace falta;
 *  C · de punta a punta, sin red: recordar, buscar el recuerdo correcto, no mezclar
 *      personajes ni modelos, y reflexionar solo cuando toca y con datos validados;
 *  D · las reglas del repo: atribución MIT, prompts en su sitio, sin dinero, sin red,
 *      colección cerrada a los clientes e índice coherente con el modelo.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

delete process.env.ARK_API_KEY;
const M = lib('personajes/memoria.js');
const E = lib('engine/embeddings.js');

console.log('\n── A · La importancia ──');
{
  check('un número limpio', M.importanciaDesde('7') === 7);
  check('decimales se redondean', M.importanciaDesde(' 8.6') === 9);
  check('un número dentro de una frase', M.importanciaDesde('yo diría 3') === 3);
  check('sin número: 5, como en AI Town', M.importanciaDesde('no sé') === 5 && M.importanciaDesde('') === 5);
  check('nunca se sale de 0–9', M.importanciaDesde('15') === 9 && M.importanciaDesde('-2') === 0);
}

console.log('\n── B · El orden de los recuerdos ──');
{
  const H = 3_600_000, ahora = 1_000 * H;
  const rec = (id, imp, acceso, creado = 0) => ({ id, personajeId: 'p', tipo: 'conversacion', texto: id, importancia: imp, huella: 'h', vector: [], creadoEn: creado, ultimoAccesoEn: acceso });
  const iguales = [{ recuerdo: rec('a', 5, ahora), relevancia: 0.5 }, { recuerdo: rec('b', 5, ahora), relevancia: 0.5 }];
  const r1 = M.ordenarRecuerdos(iguales, ahora, 1);
  check('con todos los valores iguales no da NaN (en AI Town sí)', r1.elegidos.length === 1);
  check('la recencia decae un 1 % por hora', Math.abs(M.recencia(ahora - 10 * H, ahora) - 0.99 ** 10) < 1e-12 && M.recencia(ahora, ahora) === 1);
  const c = [
    { recuerdo: rec('relevante', 2, ahora - 100 * H), relevancia: 0.95 },
    { recuerdo: rec('importante', 9, ahora - 100 * H), relevancia: 0.6 },
    { recuerdo: rec('reciente', 2, ahora), relevancia: 0.6 },
    { recuerdo: rec('nada', 0, ahora - 500 * H), relevancia: 0.1 },
  ];
  const r2 = M.ordenarRecuerdos(c, ahora, 3);
  check('elige los mejores y deja fuera el que no aporta nada', r2.elegidos.length === 3 && !r2.elegidos.some((x) => x.recuerdo.id === 'nada'));
  check('toca solo los que llevan más de 5 minutos sin tocarse', JSON.stringify(r2.aTocar.sort()) === JSON.stringify(['importante', 'relevante']));
  check('sin candidatos o con n = 0, nada', M.ordenarRecuerdos([], ahora, 3).elegidos.length === 0 && M.ordenarRecuerdos(c, ahora, 0).elegidos.length === 0);
}

console.log('\n── C · De punta a punta, sin red ──');
{
  let reloj = 10_000_000;
  const almacen = M.almacenEnMemoria(E.similitudCoseno);
  let respuesta = '6';
  const prompts = [];
  const memoria = M.crearMemoria({
    almacen,
    generarTexto: async (p) => { prompts.push(p); return respuesta; },
    vectorizar: async (textos, rol) => { const r = await E.vectorizar(textos.map((t) => ({ texto: t })), rol, { config: E.configPorDefecto() }); return { vectores: r.vectores, huella: r.huella }; },
    ahora: () => reloj,
  });
  const r = await memoria.recordar('jay', 'Ana me preguntó por mi libro de dragones y le conté cómo nació el reino de Valdor', 'conversacion', { conQuien: 'ana' });
  check('recordar guarda la importancia que puntúa el modelo', r.importancia === 6 && /significativo/.test(prompts[0]));
  check('y el vector con su huella (aquí, la simulada)', r.huella.startsWith('mock-embedding:') && r.vector.length === 1024 && r.conQuien === 'ana');
  await memoria.recordar('jay', 'Hoy publiqué una receta de pan integral', 'publicacion', { importancia: 2 });
  await memoria.recordar('jay', 'Viajé a Lima y vi el mar en invierno', 'publicacion', { importancia: 3 });
  await memoria.recordar('otro', 'Ana me preguntó por mi libro de dragones', 'conversacion', { importancia: 9 });
  almacen.todos.push({ ...almacen.todos[0], id: 'ajeno', huella: 'byteplus-embedding:otro-modelo:1024' });

  reloj += 600_000;
  const encontrados = await memoria.buscar('jay', '¿Qué le contaste a Ana de tu libro de dragones?', 2);
  check('encuentra primero el recuerdo que habla de lo mismo', encontrados[0]?.texto.includes('dragones') && encontrados[0].personajeId === 'jay');
  check('nunca devuelve recuerdos de otro personaje', encontrados.every((x) => x.personajeId === 'jay'));
  check('ni recuerdos hechos con otro modelo (otra huella)', encontrados.every((x) => x.id !== 'ajeno'));
  check('el recuerdo usado queda «tocado»', almacen.todos.find((x) => x.id === encontrados[0].id).ultimoAccesoEn === reloj);
  check('una consulta vacía no busca nada', (await memoria.buscar('jay', '   ')).length === 0);
  let fallo = ''; try { await memoria.recordar('jay', '  ', 'conversacion'); } catch (e) { fallo = e.message; }
  check('un recuerdo vacío no se guarda', /vacío/.test(fallo));

  check('con poco acumulado, no reflexiona', (await memoria.reflexionar('jay', 'Jay Reads')).length === 0);
  for (let i = 0; i < 60; i++) { reloj += 1000; await memoria.recordar('jay', `Conversación importante número ${i}`, 'conversacion', { importancia: 9 }); }
  respuesta = '[{"idea":"Me gusta explicar mi universo","afirmaciones":[0,1,99]},{"idea":"Cuido a mis lectores","afirmaciones":[2]},{"idea":"Idea tres","afirmaciones":[]},{"idea":"Idea cuatro","afirmaciones":[3]}]';
  const ideas = await memoria.reflexionar('jay', 'Jay Reads');
  check('al pasar el umbral reflexiona y guarda como mucho tres ideas', ideas.length === 3 && ideas.every((x) => x.tipo === 'reflexion'));
  check('las ideas apuntan a recuerdos reales (un índice inventado se descarta)', ideas[0].relacionados.length === 2 && ideas[0].relacionados.every((id) => almacen.todos.some((x) => x.id === id)));
  respuesta = '6';
  check('justo después de reflexionar, no vuelve a reflexionar', (await memoria.reflexionar('jay', 'Jay Reads')).length === 0);
  check('una respuesta que no es JSON no guarda nada', M.interpretarReflexion('no sé qué decir', 5).length === 0 && M.interpretarReflexion('[{"idea": 3}]', 5).length === 0);
}

console.log('\n── D · Las reglas del repositorio ──');
{
  const mem = leer('functions/src/personajes/memoria.ts'), alm = leer('functions/src/personajes/almacenFirestore.ts'), pr = leer('functions/src/creator/prompts.ts');
  check('reconoce el origen: AI Town, licencia MIT, a16z-infra', /AI Town/.test(mem) && /MIT/.test(mem) && /Copyright \(c\) 2023 a16z-infra/.test(mem) && /a16z-infra/.test(pr));
  check('los prompts internos viven en creator/prompts.ts', /export const promptDeImportancia/.test(pr) && /export const promptDeReflexion/.test(pr) && /from '\.\.\/creator\/prompts'/.test(mem));
  check('la memoria no llama a la red ni a ningún proveedor', ![mem, alm].some((s) => /fetch\(|fetchJson|providers\/|bytepluses|googleapis/.test(sinComentarios(s))));
  check('ni toca el dinero', ![mem, alm].some((s) => /creditEngine|spendCredits|refundCredits|completeCredits/.test(sinComentarios(s))));
  check('el almacén filtra por personaje y por huella antes de comparar', /where\('personajeId', '==', personajeId\)\.where\('huella', '==', huella\)/.test(alm) && /findNearest/.test(alm) && /distanceMeasure: 'COSINE'/.test(alm));
  const reglas = leer('firestore.rules');
  check('la colección de recuerdos está cerrada a todos los clientes', /match \/characterMemories\/\{recuerdoId\} \{\s*allow read, write: if false;\s*\}/.test(reglas));
  const idx = JSON.parse(leer('firestore.indexes.json')).indexes.filter((i) => i.collectionGroup === 'characterMemories');
  const vec = idx.find((i) => i.fields.some((f) => f.vectorConfig));
  check('hay índice vectorial con personaje + huella', !!vec && vec.fields[0].fieldPath === 'personajeId' && vec.fields[1].fieldPath === 'huella');
  check('y sus dimensiones son las del modelo por defecto', vec.fields[2].vectorConfig.dimension === E.configPorDefecto().dimensiones);
  check('hay índice para leer los últimos recuerdos', idx.some((i) => i.fields.some((f) => f.fieldPath === 'creadoEn' && f.order === 'DESCENDING')));
  check('esta suite está en la cadena de `npm test`', /personaje-memoria\.test\.mjs/.test(leer('functions/package.json')));
}

console.log('\nMemoria de los personajes: importancia, orden, búsqueda, reflexión y reglas');
if (failures > 0) { console.error(`\n${failures} comprobación(es) fallida(s)`); process.exit(1); }
