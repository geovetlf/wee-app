/**
 * FILMMAKER · WEË BRAIN COMO DIRECTOR — EL CLIENTE (servicio + cableado de la pantalla).
 *   S · el servicio habla con `brainChat` (no con otro callable) y manda SOLO contexto e id de producción;
 *   F · fallos: puerta cerrada ≠ sin conexión ≠ sin Credits; una propuesta ilegible es «sin propuesta»;
 *   P · la propuesta se lee tal cual, con su revisión base y el aviso de lo que puso la persona;
 *   C · la pantalla: la caja es la común (`CajaDePrompt`), nada se aplica sin Aprobar, el demo se marca, i18n sin textos a mano.
 * Ligera: se cargan las FUENTES (sin red).      node functions/test/filmmaker-director-cliente.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ts = createRequire(path.join(RAIZ, 'package.json'))('typescript');
let fallos = 0; let n = 0;
const check = (nombre, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${nombre}` + (extra ? ` — ${extra}` : '')); if (!cond) fallos++; };
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let llamado = null;
let cortocircuito = null;
const STUBS = {
  'firebase/functions': { httpsCallable: (_f, nombre) => async (datos) => { llamado = { nombre, datos }; if (cortocircuito) throw cortocircuito; return { data: llamado.respuesta }; } },
  '../config/firebase': { functions: {} },
  './brainService': { newMessageId: () => 'm_test' },
  './creditsService': { creditsShortfall: (e) => (e && e.code === 'functions/resource-exhausted' ? { falta: 1 } : null) },
};
const cargar = (rel) => {
  const js = ts.transpileModule(leer(rel), { compilerOptions: { target: 'ES2022', module: 'commonjs' } }).outputText;
  const m = new Module(rel); m.filename = path.join(RAIZ, rel); m.paths = [];
  m.require = (p) => (STUBS[p] ?? require(p));
  m._compile(js, m.filename); return m.exports;
};
const svc = cargar('services/filmmakerDirectorService.ts');

/* S · el servicio */
const llamadas = [];
const servicio = svc.crearDirectorService(async (datos) => { llamadas.push(datos); return { chatId: 'c1', messageId: 'x', text: 'Te lo propongo.', demo: false, credits: 0, proposal: { productionId: 'p1', baseRevision: 4, operations: [{ op: 'remove_location', locationId: 'lo_1' }], reasons: ['Quitas el volcán'], applied: 1, touchesUserOrigin: ['ch_1'] }, proposalIssue: null }; });
const ctx = { tipo: 'film', estilo: 'sci_fi', etapa: 'universo', productionId: 'p1' };
const r1 = await servicio.conversar({ mensaje: 'quita el volcán', contexto: ctx, locale: 'es', chatId: 'c0' });
check('S1 manda el mensaje y el contexto en el campo `filmmaker` de brainChat', llamadas[0].message === 'quita el volcán' && llamadas[0].filmmaker.tipo === 'film' && llamadas[0].filmmaker.estilo === 'sci_fi' && llamadas[0].chatId === 'c0' && llamadas[0].locale === 'es');
check('S2 la producción NO viaja: solo su id (se lee del servidor)', llamadas[0].filmmaker.productionId === 'p1' && !('production' in llamadas[0]) && !('production' in llamadas[0].filmmaker));
check('S3 respuesta: texto, propuesta con revisión base y aviso de lo «tuyo»', r1.ok && r1.valor.texto === 'Te lo propongo.' && r1.valor.propuesta.baseRevision === 4 && r1.valor.propuesta.touchesUserOrigin[0] === 'ch_1' && r1.valor.propuesta.reasons[0] === 'Quitas el volcán');
const sinProp = await svc.crearDirectorService(async () => ({ chatId: 'c1', text: '¿Quién es el villano?', proposal: null, proposalIssue: null })).conversar({ mensaje: 'hola', contexto: ctx, locale: 'es' });
check('S4 una pregunta sola: texto y ninguna propuesta', sinProp.ok && sinProp.valor.propuesta === null && sinProp.valor.texto === '¿Quién es el villano?');
const rota = await svc.crearDirectorService(async () => ({ chatId: 'c1', text: 'ok', proposal: { productionId: 'p1', baseRevision: 1, operations: [{ nombre: 'sin op' }] } })).conversar({ mensaje: 'hola', contexto: ctx, locale: 'es' });
check('S5 una propuesta ilegible se trata como «sin propuesta» (nunca se aplica a medias)', rota.ok && rota.valor.propuesta === null);
const rar = await svc.crearDirectorService(async () => 'basura').conversar({ mensaje: 'hola', contexto: ctx, locale: 'es' });
check('S6 una respuesta sin la forma esperada es un fallo, no un crash', rar.ok === false && rar.fallo === 'otro');
const duplicado = await servicio.conversar({ mensaje: 'a', contexto: ctx, locale: 'es', messageId: 'fijo' });
check('S7 el messageId se puede fijar (reintento idempotente, no cobra dos veces)', llamadas[llamadas.length - 1].messageId === 'fijo' && duplicado.ok);

/* F · fallos */
const falla = (e) => svc.crearDirectorService(async () => { throw e; }).conversar({ mensaje: 'a', contexto: ctx, locale: 'es' });
check('F1 puerta cerrada (razón del servidor)', (await falla({ code: 'functions/failed-precondition', details: { reason: 'director_closed' } })).fallo === 'cerrado');
check('F2 NOT_AVAILABLE sin detalles también es cerrado (failed-precondition)', (await falla({ code: 'functions/failed-precondition' })).fallo === 'cerrado');
check('F3 sin conexión', (await falla({ code: 'functions/unavailable' })).fallo === 'sin_conexion' && (await falla(new Error('network error'))).fallo === 'sin_conexion');
check('F4 sin Credits', (await falla({ code: 'functions/resource-exhausted' })).fallo === 'sin_credits');
check('F5 contexto inválido', (await falla({ code: 'functions/invalid-argument', details: { reason: 'director_context_invalid' } })).fallo === 'contexto');
check('F6 cualquier otra cosa: otro (sin filtrar mensajes internos)', (await falla({ code: 'functions/aborted', message: 'secreto interno' })).fallo === 'otro');

/* C · cableado */
const hook = sinComentarios(leer('hooks/useDirectorDeFilmmaker.ts'));
const pantalla = sinComentarios(leer('screens/FilmmakerCrearScreen.tsx'));
const burbuja = sinComentarios(leer('components/filmmaker/BurbujaDelDirector.tsx'));
const servicioFuente = sinComentarios(leer('services/filmmakerDirectorService.ts'));
check('C1 el servicio llama a `brainChat` y a ningún otro callable (una sola inteligencia)', /'brainChat'/.test(servicioFuente) && !/httpsCallable<[^>]*>\(functions, '(?!brainChat)/.test(servicioFuente));
check('C2 la pantalla usa la caja común (CajaDePrompt) y no importa otro componente de chat', /CajaDePrompt/.test(pantalla) && !/Chat(Box|Window|Panel)/.test(pantalla + burbuja + hook));
check('C3 aprobar aplica por `productions` con la revisión base de la propuesta; descartar no aplica nada', /applyProductionOperations/.test(hook) && /expectedRevision: propuesta\.baseRevision/.test(hook) && !/applyProductionOperations/.test(burbuja));
check('C4 la pantalla no aplica nada sola: solo `aprobar` (botón) llega a `applyProductionOperations`', !/applyProductionOperations/.test(pantalla) && /onAprobar=\{\(\) => \{ void director\.aprobar\(\); \}\}/.test(pantalla));
check('C5 cerrado: se recuerda y la pantalla sigue como hoy (añadir a mano / crear)', /cerrada\.current = true; return 'cerrado'/.test(hook) && /r === 'cerrado' && !enDemo\) anadirAMano\(\)/.test(pantalla));
check('C6 el demo no llama a ningún servidor y rotula la respuesta de ejemplo', /if \(o\.demo\)/.test(hook) && /demo: true/.test(hook) && /demoBadge/.test(burbuja));
check('C7 la capa de Idea sigue creando la producción como hoy (Brain habla DESPUÉS, sin condicionarla)', /void director\.enviar\(fraseDe\(base\)/.test(pantalla) && !/await director\.enviar/.test(pantalla));
check('C8 el contexto lleva tipo y estilo elegidos por la persona (sin ellos no hay director)', /tipoId && estilo \?/.test(pantalla));
check('C9 sin textos de interfaz a mano en la burbuja: todo por t()', !/>\s*[A-ZÁÉÍÓÚ][a-záéíóú]+[^<{]*</.test(burbuja.replace(/\{[^}]*\}/g, '')) && /filmmakerDirector\./.test(burbuja));
const es = leer('i18n/textos/es/filmmakerDirector.ts'); const en = leer('i18n/textos/en/filmmakerDirector.ts');
const claves = (s) => [...s.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]).sort().join(',');
check('C10 es y en tienen las mismas claves', claves(es) === claves(en) && claves(es).length > 50);
check('C11 las claves usadas por la burbuja y el hook existen', [...(burbuja + hook).matchAll(/filmmakerDirector\.(\w+)/g)].every((m) => new RegExp(`\\b${m[1]}(_other)?:`).test(es)));
const faltan = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((d) => fs.existsSync(path.join(RAIZ, 'i18n/textos', d, 'index.ts')) && !fs.existsSync(path.join(RAIZ, 'i18n/textos', d, 'filmmakerDirector.ts')));
check('C12 los 42 idiomas tienen el módulo (los 40 sin revisión nativa van rotulados PROVISIONAL)', faltan.length === 0 && /PROVISIONAL/.test(leer('i18n/textos/ja/filmmakerDirector.ts')));
check('C13 «Weë» con diéresis y nada de «WEE»/«Wee» en los textos', /Weë/.test(es) && !/\bWEE\b|\bWee\b/.test(es + en));

console.log(`\n${n - fallos}/${n}`);
process.exit(fallos ? 1 : 0);
