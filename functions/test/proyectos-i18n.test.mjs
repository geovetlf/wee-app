/*
 * MIS PROYECTOS, EN DOS IDIOMAS (fase 2 · bloque 4A).
 *
 * Dos pantallas pequeñas y una cosa que no había aparecido hasta ahora en esta
 * migración: un CONTADOR. "1 creación" / "5 creaciones" no se decide con un
 * `if`, porque el inglés parte los tramos donde quiere y el ruso necesita tres
 * formas. Aquí se ejecuta el traductor de verdad —el mismo de la app— y se le
 * piden 0, 1 y 2 en los dos idiomas.
 *
 * Lo demás es la regla de siempre: la interfaz se traduce, lo que escribió la
 * persona no. El nombre de un proyecto es suyo y se lee igual en inglés.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const soloCodigo = (t) => t
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/\/\/[^\n]*/g, '');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const cargar = (ruta, arreglo = (x) => x) => {
  const js = ts.transpileModule(arreglo(leer(ruta)), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js, 'utf8').toString('base64'));
};

const ES = {}, EN = {};
for (const modulo of ['projects', 'weeai', 'common']) {
  ES[modulo] = (await cargar('i18n/textos/es/' + modulo + '.ts'))[modulo];
  EN[modulo] = (await cargar('i18n/textos/en/' + modulo + '.ts', (s) =>
    s.replace(/: typeof import\([^)]*\)\.[A-Za-z]+/, '')))[modulo];
}

/* El traductor REAL. Solo se le sustituye la cadena de respaldo, que vive en
 * otro archivo y aquí no se puede importar por ruta relativa. */
const { crearTraductor } = await cargar('i18n/traducir.ts', (s) =>
  s.replace("import { cadenaDeRespaldo } from './resolver';",
    "const cadenaDeRespaldo = (l) => (l.startsWith('es') ? ['es', 'en'] : ['en']);"));
const DICCIONARIOS = { es: ES, en: EN };
const tEs = crearTraductor('es', DICCIONARIOS);
const tEn = crearTraductor('en', DICCIONARIOS);

const LISTA = 'screens/ProjectsScreen.tsx';
const DETALLE = 'screens/ProjectScreen.tsx';
const CODIGO = { [LISTA]: soloCodigo(leer(LISTA)), [DETALLE]: soloCodigo(leer(DETALLE)) };
const TODO = CODIGO[LISTA] + '\n' + CODIGO[DETALLE];

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Las dos pantallas piden sus textos, no los llevan dentro ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const MARCAS = /Weë|WEË AI|Wäll|Weëls|WeeTalk|ËContact|Credits/;
  const sueltas = [];
  for (const [ruta, codigo] of Object.entries(CODIGO)) {
    codigo.split('\n').forEach((l, i) => {
      if (/console\.(warn|error|log)/.test(l)) return;
      for (const m of l.matchAll(/(['"])([^'"\n]*[áéíóúñ¿¡][^'"\n]*)\1/g)) {
        if (MARCAS.test(m[2]) && !/[áéíóú¿¡ñ]/.test(m[2].replace(MARCAS, ''))) continue;
        sueltas.push(ruta.split('/').pop() + ':' + (i + 1) + ' ' + m[2].slice(0, 40));
      }
      for (const m of l.matchAll(/>([^<>{}\n]*[áéíóúñ¿¡][^<>{}\n]*)</g)) {
        sueltas.push(ruta.split('/').pop() + ':' + (i + 1) + ' (jsx) ' + m[1].trim().slice(0, 40));
      }
    });
  }
  check('1) no queda ni una frase en español escrita a mano', sueltas.length === 0, sueltas.slice(0, 4).join(' | '));

  const FUGAS = ['Mis proyectos', 'Tus creaciones, ordenadas', 'Proyectos', 'Nuevo proyecto',
    'Todavía no tienes proyectos', 'Crear mi primer proyecto', 'Abrir', 'Creaciones', 'Añadir',
    'Eliminar proyecto', 'Cambiar nombre', 'Guardar nombre', 'No encontramos este proyecto',
    'creación', 'creaciones', '¿Qué le falta a este proyecto?', 'Crear algo nuevo'];
  const vivas = FUGAS.filter((f) => new RegExp("['\"]" + f).test(TODO));
  check('2) ni ninguna de las ' + FUGAS.length + ' que había', vivas.length === 0, vivas.join(' · '));

  /* CONTROL: el detector encuentra el español cuando lo hay de verdad. */
  check('3) control: el detector sí ve el español del diccionario',
    Object.values(ES.projects).filter((v) => /[áéíóúñ¿¡]/.test(v)).length > 8);

  /* Y las dos piden al traductor, no se lo inventan. */
  check('4) las dos usan el traductor de siempre',
    /useT\(\)/.test(CODIGO[LISTA]) && /useT\(\)/.test(CODIGO[DETALLE])
    && !/i18next|react-intl|Localization\.locale/.test(TODO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Las claves, completas en los dos idiomas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('5) español e inglés tienen exactamente las mismas claves',
    Object.keys(ES.projects).sort().join() === Object.keys(EN.projects).sort().join(),
    Object.keys(ES.projects).length + ' claves');

  const vacias = Object.keys(ES.projects).filter((k) => !String(ES.projects[k]).trim() || !String(EN.projects[k] ?? '').trim());
  check('6) ninguna está vacía', vacias.length === 0, vacias.join(' '));

  check('7) el módulo está dado de alta en los dos índices',
    ['es', 'en'].every((i) => /import \{ projects \} from '\.\/projects';/.test(leer('i18n/textos/' + i + '/index.ts'))
      && /^  projects,$/m.test(leer('i18n/textos/' + i + '/index.ts'))));

  /* Toda clave que se pide existe, y ninguna del módulo sobra. */
  const pedidas = [...TODO.matchAll(/'((?:projects|weeai|common)\.[A-Za-z0-9_]+)'/g)].map((m) => m[1]);
  /*
   * Se comprueba RESOLVIENDO, no buscando la entrada: una clave con plural
   * (`creations`) no existe como tal —existen sus formas `_one` y `_other`— y
   * el traductor es quien sabe cuál toca. Si algo falta, devuelve la clave.
   */
  const rotas = [...new Set(pedidas)].filter((c) =>
    [tEs, tEn].some((t) => t(c, { contador: 1 }) === c));
  check('8) las ' + new Set(pedidas).size + ' claves que piden estas pantallas existen en los dos',
    rotas.length === 0, rotas.join(' '));

  const usadas = new Set(pedidas.filter((c) => c.startsWith('projects.')).map((c) => c.split('.')[1]));
  /* El contador se pide sin sufijo: sus dos formas cuentan como usadas. */
  const sobran = Object.keys(ES.projects).filter((k) => !usadas.has(k) && !usadas.has(k.replace(/_(one|other)$/, '')));
  check('9) y el módulo no arrastra ninguna que ya nadie use', sobran.length === 0, sobran.join(' '));

  /* Se reutiliza lo que ya existía en vez de escribirlo otra vez. */
  const reutilizadas = [...new Set(pedidas.filter((c) => !c.startsWith('projects.')))].sort();
  check('10) reutiliza ' + reutilizadas.length + ' claves que ya existían', reutilizadas.length >= 6, reutilizadas.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · El contador, con Intl y no con un if ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('11) la pantalla pide el contador, no elige la frase',
    /t\('projects\.creations', \{ contador: jobs\.length \}\)/.test(CODIGO[DETALLE])
    && !/jobs\.length === 1 \?/.test(CODIGO[DETALLE]));

  check('12) el contador tiene sus dos formas en los dos idiomas',
    !!ES.projects.creations_one && !!ES.projects.creations_other
    && !!EN.projects.creations_one && !!EN.projects.creations_other);

  /* Y se ejecuta: el traductor de la app, con 0, 1 y 2. */
  const es = [0, 1, 2, 11].map((n) => tEs('projects.creations', { contador: n }));
  const en = [0, 1, 2, 11].map((n) => tEn('projects.creations', { contador: n }));
  check('13) en español dice ' + es.join(' · '),
    es.join('|') === '0 creaciones|1 creación|2 creaciones|11 creaciones', es.join(' · '));
  check('13) y en inglés ' + en.join(' · '),
    en.join('|') === '0 creations|1 creation|2 creations|11 creations', en.join(' · '));

  /* CONTROL: la forma la decide el idioma, no el número a secas. */
  check('14) control: cada idioma elige su forma por su cuenta',
    tEs('projects.creations', { contador: 1 }) !== tEn('projects.creations', { contador: 1 })
    && tEs('projects.creations', { contador: 1 }).includes('creación'));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Interpolación: nada se pega ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const huecos = (s) => [...String(s).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
  const desparejos = Object.keys(ES.projects).filter((k) => huecos(ES.projects[k]) !== huecos(EN.projects[k]));
  check('15) los huecos son los mismos en los dos idiomas', desparejos.length === 0, desparejos.join(' '));

  const conHuecos = Object.keys(ES.projects).filter((k) => huecos(ES.projects[k]));
  check('16) hay ' + conHuecos.length + ' frases con hueco', conHuecos.length >= 5, conHuecos.join(' '));

  /* Quien pide una frase con hueco le pasa el valor. */
  const llamadas = [...TODO.matchAll(/t\('(projects\.[A-Za-z0-9_]+)'(,\s*\{[^}]*\})?\)/g)];
  const sinValores = llamadas.filter(([, clave, valores]) => {
    const k = clave.split('.')[1];
    const forma = ES.projects[k] ?? ES.projects[k + '_other'];
    return huecos(forma || '') && !valores;
  }).map((m) => m[1]);
  check('17) y cada llamada con hueco pasa lo suyo', sinValores.length === 0, sinValores.join(' '));

  /* Ni una frase armada a mano con el nombre del proyecto o el contador. */
  check('18) ninguna frase se arma pegando cadenas',
    !/¿Eliminar .*\$\{project\.name\}/.test(TODO)
    && !/`\$\{jobs\.length\} creaciones`/.test(TODO)
    && !/'.*' \+ project\.name|project\.name \+ '/.test(TODO));

  /* Y se ejecuta: el nombre entra tal cual. */
  const aviso = tEn('projects.deleteConfirm', { nombre: 'Mi proyecto de verano' });
  check('19) el nombre del proyecto viaja intacto dentro de la frase inglesa',
    aviso.includes('Mi proyecto de verano') && !/\{\{/.test(aviso), aviso);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Lo que es de la persona sigue siendo suyo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Los valores del usuario se pintan crudos: nunca t(...) alrededor. */
  check('20) el nombre del proyecto se pinta tal cual, sin traductor',
    /\{project\.name\}/.test(CODIGO[DETALLE]) && /\{project\.name\}/.test(CODIGO[LISTA])
    && !/t\(project\.name\)|t\(\{?\s*project\.name/.test(TODO));
  check('20) y la meta de cada creación también',
    /\{job\.goal\}/.test(CODIGO[DETALLE]) && !/t\(job\.goal\)/.test(TODO));
  check('20) igual que el emoji que eligió', /\{project\.emoji\}/.test(CODIGO[DETALLE]) && !/t\(project\.emoji\)/.test(TODO));

  /* Y no se han colado en el diccionario. */
  const enDiccionario = (txt) => ['projects', 'weeai', 'common']
    .some((m) => Object.values(ES[m]).includes(txt) || Object.values(EN[m]).includes(txt));
  const NOMBRES = ['Mi proyecto', 'Mi restaurante', 'Mi canción', 'Mi logo', 'Mi proyecto de verano'];
  check('21) ningún nombre de proyecto está en el diccionario',
    NOMBRES.every((n) => !enDiccionario(n)), NOMBRES.filter(enDiccionario).join(' '));

  /*
   * "Mi proyecto" es el nombre que se GUARDA cuando alguien no escribe ninguno.
   * Es un dato, no un rótulo: traducirlo haría que el mismo proyecto se llamara
   * distinto según el idioma del día en que se creó. Se queda donde está.
   */
  const servicio = leer('services/projectsService.ts');
  check('22) el nombre por defecto se sigue guardando, no traduciendo',
    /name: name\.trim\(\)\.slice\(0, 60\) \|\| 'Mi proyecto'/.test(servicio)
    && !/useT|contexts\/IdiomaContext/.test(servicio));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Ni una ruta, ni un identificador, ni una acción ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('23) la lista sigue abriendo un proyecto y creando por su servicio',
    /navigation\.navigate\('Project', \{ id: project\.id \}\)/.test(CODIGO[LISTA])
    && /projectsService\.create\(user\.uid, name, emoji\)/.test(CODIGO[LISTA])
    && /projectsService\.list\(user\.uid\)/.test(CODIGO[LISTA])
    && /navigation\.navigate\('Login'\)/.test(CODIGO[LISTA]));

  check('24) el detalle conserva sus cuatro operaciones',
    /projectsService\.get\(id\)/.test(CODIGO[DETALLE])
    && /projectsService\.jobsForProject\(user\.uid, id\)/.test(CODIGO[DETALLE])
    && /projectsService\.rename\(project\.id, name\)/.test(CODIGO[DETALLE])
    && /projectsService\.remove\(project\.id\)/.test(CODIGO[DETALLE]));

  check('25) y sus dos destinos',
    (CODIGO[DETALLE].match(/navigation\.navigate\('WeeCreator'\)/g) || []).length === 2
    && /navigation\.navigate\('CreatorFlow', \{ experienceId: job\.experienceId, jobId: job\.id \}\)/.test(CODIGO[DETALLE]));

  check('26) los once emojis de proyecto no se han tocado',
    /PROJECT_EMOJIS = \['📁', '🍔', '🎵', '🚗', '🏷️', '🏠', '💼', '🎬', '📚', '💄', '🌟'\]/.test(leer('services/projectsService.ts')));

  check('27) el aviso de borrar sigue avisando en web y en móvil, y sin borrar creaciones',
    /window\.confirm\(t\('projects\.deleteConfirmWeb'/.test(CODIGO[DETALLE])
    && /Alert\.alert\(t\('projects\.deleteProject'\), t\('projects\.deleteConfirm'/.test(CODIGO[DETALLE])
    && /style: 'destructive'/.test(CODIGO[DETALLE])
    && /Tus creaciones no se borran/.test(ES.projects.deleteConfirm));

  check('28) control: ni el motor de IA, ni los proveedores, ni los Credits',
    !/aiRouter|engine\/|providers\/|spendCredits|creditCosts|gemini|seedance/i.test(TODO));
  check('28) ni se toca cómo se guarda un proyecto',
    !/setDoc|updateDoc|deleteDoc|collection\(/.test(TODO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · El inglés, en inglés ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const acentos = Object.keys(EN.projects).filter((k) => /[áéíóúñ¿¡]/i.test(EN.projects[k]));
  check('29) ninguna frase inglesa lleva tildes, eñes ni signos de apertura',
    acentos.length === 0, acentos.map((k) => k + '=' + EN.projects[k]).join(' | '));

  const PALABRAS = [' tu ', ' tus ', ' para ', ' una ', ' proyecto', ' creación', ' crea '];
  const castellano = Object.keys(EN.projects).filter((k) => {
    const v = ' ' + String(EN.projects[k]).toLowerCase() + ' ';
    return PALABRAS.some((p) => v.includes(p));
  });
  check('30) ni palabras sueltas en castellano', castellano.length === 0, castellano.join(' '));

  /* Y al revés: nada se quedó copiado del español. Solo se libran las frases
   * que son puro hueco —"Emoji {{emoji}}" no tiene idioma que traducir—. */
  const soloHuecos = (v) => !/[A-Za-zÀ-ÿ]/.test(String(v).replace(/\{\{[^}]*\}\}/g, '').replace(/Emoji/g, ''));
  const iguales = Object.keys(ES.projects).filter((k) => ES.projects[k] === EN.projects[k] && !soloHuecos(ES.projects[k]));
  check('31) y el módulo está traducido de verdad, no copiado', iguales.length === 0, iguales.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Que quepa un idioma más largo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const fuente = leer(LISTA) + '\n' + leer(DETALLE);
  check('32) ningún rótulo lleva ancho ni altura clavados',
    !/width: scale\(\d+\)[^}]*\n\s*fontSize/.test(fuente)
    && !/(createText|cardMeta|headMeta|introTitle|emptyTitle|smallButtonText):\s*\{[^}]*height:/.test(fuente));
  check('33) y el texto que puede crecer envuelve o se recorta con numberOfLines',
    (fuente.match(/numberOfLines=/g) || []).length >= 2 && /flex: 1/.test(fuente));

  const largas = Object.keys(ES.projects).filter((k) => {
    const a = String(ES.projects[k]).length, b = String(EN.projects[k]).length;
    return b > 40 && b > a * 1.8;
  });
  check('34) ninguna frase inglesa se dispara de largo', largas.length === 0, largas.join(' '));

  /* Ningún formato clavado a un idioma en estas dos pantallas. */
  check('35) no hay formatos clavados al español',
    !/toLocale(String|DateString|TimeString)\('es'\)|(NumberFormat|DateTimeFormat)\('es'\)/.test(fuente));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
