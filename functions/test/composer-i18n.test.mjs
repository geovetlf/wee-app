/*
 * EL COMPOSER, EN DOS IDIOMAS (fase 2 · bloque 4B).
 *
 * Todo lo que se lee al publicar: la hoja del +, la entrada del Home, el
 * espacio de crear, la agenda de ËContact, el buscador de lugares y la
 * encuesta. Y todo lo que NO se traduce: lo que escribe la persona, los
 * nombres de las secciones, los identificadores y los límites.
 *
 * Se ejecuta lo que se puede ejecutar —los diccionarios, las constantes y el
 * validador de encuestas se compilan e importan de verdad— y lo que no, se lee
 * como código sin comentarios.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { textosDe } from './i18n-ayuda.mjs';

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

const ES = textosDe('es');
const EN = textosDe('en');

/* El traductor REAL de la app, con la cadena de respaldo sustituida. */
const { crearTraductor } = await cargar('i18n/traducir.ts', (s) => s
  .replace("import { cadenaDeRespaldo } from './resolver';",
    "const cadenaDeRespaldo = (l) => (l.startsWith('es') ? ['es', 'en'] : ['en']);")
  /* Desde la fase 5O el traductor escribe los números con Intl. Se le pone el
   * mismo formateador que usa de verdad, no uno de mentira: si no, esta prueba
   * estaría probando un traductor que no formatea y el de la app sí. */
  .replace("import { formatearNumero } from './formato';",
    "const formatearNumero = (v, l) => new Intl.NumberFormat(l).format(v);"));
const tEs = crearTraductor('es', { es: ES, en: EN });
const tEn = crearTraductor('en', { es: ES, en: EN });

const POLL = await cargar('utils/pollDraft.ts');
const FEED = await cargar('utils/sectionFeed.ts', (s) => s.slice(s.indexOf('export const MURO_GENERAL')).replace(/^(?!export const (MURO_GENERAL|DESTINO_BRAIN_EXCLUIDO|destinosDisponibles))[\s\S]*?(?=export const destinosDisponibles)/, (m) => m));

/* Las piezas del Composer. */
const HOJA = 'components/CreateSheet.tsx';
const ENTRADA = 'components/creator/ComposerEntry.tsx';
const CREAR = 'screens/CreateScreen.tsx';
const AGENDA = 'components/SelectorDeEContacts.tsx';
const LUGAR = 'screens/AgregarUbicacionScreen.tsx';
const BORRADOR = 'utils/pollDraft.ts';
const FUENTE_DESTINOS = "utils/sectionFeed.ts";
const PIEZAS = [HOJA, ENTRADA, CREAR, AGENDA, LUGAR, BORRADOR, FUENTE_DESTINOS];
const C = Object.fromEntries(PIEZAS.map((p) => [p, soloCodigo(leer(p))]));
const TODO = Object.values(C).join('\n');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Ni una frase suelta en el Composer ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const MARCA = /Weë|Weël|Weë AI|ËContact|Wäll|WeeTalk|Credits/;
  const sueltas = [];
  for (const [ruta, codigo] of Object.entries(C)) {
    codigo.split('\n').forEach((l, i) => {
      if (/console\.(warn|error|log)/.test(l)) return;
      for (const m of l.matchAll(/(['"])([^'"\n]*[áéíóúñ¿¡][^'"\n]*)\1/g)) {
        if (MARCA.test(m[2]) && !/[áéíóúñ¿¡]/.test(m[2].replace(MARCA, ''))) continue;
        sueltas.push(ruta.split('/').pop() + ':' + (i + 1) + ' ' + m[2].slice(0, 40));
      }
      for (const m of l.matchAll(/>([^<>{}\n]*[áéíóúñ¿¡][^<>{}\n]*)</g)) {
        sueltas.push(ruta.split('/').pop() + ':' + (i + 1) + ' (jsx) ' + m[1].trim().slice(0, 40));
      }
    });
  }
  check('1) las ' + PIEZAS.length + ' piezas del Composer no llevan ni una frase escrita a mano',
    sueltas.length === 0, sueltas.slice(0, 4).join(' | '));

  const FUGAS = ['Crear', 'Publicación', 'Cámara', 'Foto o vídeo', 'Ubicación', 'Encuesta', 'Multimedia',
    'Nueva publicación', 'Publicar', 'Público', 'Agregar ubicación', 'Buscar un lugar', 'Agregar opción',
    'Duración de la encuesta', 'Zona aproximada', 'PUBLICAR EN', 'Permiso requerido', 'Escribe algo'];
  const vivas = FUGAS.filter((f) => new RegExp("['\"]" + f).test(TODO));
  check('2) ni ninguna de las ' + FUGAS.length + ' que había', vivas.length === 0, vivas.join(' · '));

  check('3) control: el detector sí ve el español del diccionario',
    Object.values(ES.composer).filter((v) => /[áéíóúñ¿¡]/.test(v)).length > 40);

  check('4) y las seis usan el traductor de siempre',
    [HOJA, ENTRADA, CREAR, AGENDA, LUGAR].every((p) => /useT\(\)/.test(C[p]))
    && !/i18next|react-intl|Localization\.locale/.test(TODO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Español e inglés, completos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('5) los dos idiomas tienen exactamente las mismas claves',
    Object.keys(ES.composer).sort().join() === Object.keys(EN.composer).sort().join(),
    Object.keys(ES.composer).length + ' claves');

  const vacias = Object.keys(ES.composer).filter((k) => !String(ES.composer[k]).trim() || !String(EN.composer[k] ?? '').trim());
  check('6) ninguna está vacía', vacias.length === 0, vacias.join(' '));

  /* Toda clave que se pide se resuelve; ninguna del módulo sobra. */
  /*
   * Las claves se buscan en el fuente CRUDO: `soloCodigo` se atraganta con
   * CreateScreen —un falso /* dentro de una cadena le hace tragarse bloques— y
   * dejaría fuera llamadas que sí existen.
   */
  const CRUDO = PIEZAS.map(leer).join(String.fromCharCode(10));
  const pedidas = [...CRUDO.matchAll(/'((?:composer|common|weeai|home)\.[A-Za-z0-9_]+)'/g)].map((m) => m[1]);
  const rotas = [...new Set(pedidas)].filter((c) => [tEs, tEn].some((t) => t(c, { contador: 1 }) === c));
  check('7) las ' + new Set(pedidas).size + ' claves que pide el Composer existen en los dos',
    rotas.length === 0, rotas.join(' '));

  const usadas = new Set(pedidas.filter((c) => c.startsWith('composer.')).map((c) => c.split('.')[1]));
  const sobran = Object.keys(ES.composer).filter((k) => !usadas.has(k) && !usadas.has(k.replace(/_(one|other)$/, '')));
  check('8) y el módulo no arrastra ninguna que ya nadie use', sobran.length === 0, sobran.join(' '));

  const reutilizadas = [...new Set(pedidas.filter((c) => !c.startsWith('composer.')))].sort();
  check('9) reutiliza ' + reutilizadas.length + ' claves que ya existían', reutilizadas.length >= 3, reutilizadas.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Plurales e interpolación, ejecutados ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const PLURALES = ['removeMentions', 'pollDays', 'pollMaxPhotos', 'seconds', 'minutes'];
  const faltan = PLURALES.filter((b) => !ES.composer[b + '_one'] || !ES.composer[b + '_other']
    || !EN.composer[b + '_one'] || !EN.composer[b + '_other']);
  check('10) los ' + PLURALES.length + ' contadores tienen sus dos formas en los dos idiomas', faltan.length === 0, faltan.join(' '));

  const dias = [1, 3, 7].map((n) => tEs('composer.pollDays', { contador: n }));
  const days = [1, 3, 7].map((n) => tEn('composer.pollDays', { contador: n }));
  check('11) la duración de una encuesta: ' + dias.join(' · '),
    dias.join('|') === '1 día|3 días|7 días' && days.join('|') === '1 day|3 days|7 days', days.join(' · '));

  check('12) y el contador lo decide Intl, no un if',
    tEs('composer.removeMentions', { contador: 1 }) === 'Quitar la mención'
    && tEs('composer.removeMentions', { contador: 2 }) === 'Quitar las menciones'
    && tEn('composer.removeMentions', { contador: 1 }) === 'Remove the mention'
    && !/econtacts\.length === 1 \?/.test(C[CREAR]));

  /* Los huecos son los mismos en los dos idiomas. */
  const huecos = (s) => [...String(s).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
  const desparejos = Object.keys(ES.composer).filter((k) => huecos(ES.composer[k]) !== huecos(EN.composer[k]));
  check('13) los huecos coinciden en los dos idiomas', desparejos.length === 0, desparejos.join(' '));

  const conHuecos = Object.keys(ES.composer).filter((k) => huecos(ES.composer[k]));
  check('14) hay ' + conHuecos.length + ' frases con interpolación', conHuecos.length >= 18, String(conHuecos.length));

  /* Y quien las pide, les pasa los valores. */
  const llamadas = [...TODO.matchAll(/t\('(composer\.[A-Za-z0-9_]+)'(,\s*\{[^{}]*\})?\)/g)];
  const sinValores = llamadas.filter(([, clave, valores]) => {
    const k = clave.split('.')[1];
    const forma = ES.composer[k] ?? ES.composer[k + '_other'];
    return huecos(forma || '') && !valores;
  }).map((m) => m[1]);
  check('15) y cada llamada con hueco pasa lo suyo', sinValores.length === 0, sinValores.join(' '));

  /* Ninguna frase se arma pegando trozos. */
  check('16) ninguna frase se construye concatenando',
    !/'Quitar ' \+|\+ ' segundos'|`\$\{texto\} Abre las opciones/.test(TODO)
    && !/Visibilidad: \$\{/.test(TODO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Lo que NO se traduce ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Lo que escribe la persona se pinta crudo. */
  check('17) el texto de la publicación no pasa por el traductor',
    /value=\{postText\}/.test(C[CREAR]) && !/t\(postText\)/.test(C[CREAR]));
  check('17) ni el texto de una opción de encuesta', /value=\{option\.text\}/.test(C[CREAR]) && !/t\(option\.text\)/.test(C[CREAR]));
  check('17) ni la pregunta', /value=\{poll\.question\}/.test(C[CREAR]) && !/t\(poll\.question\)/.test(C[CREAR]));
  check('17) ni el nombre de un ËContact', /\{persona\.perfil\.displayName\}/.test(C[AGENDA]) && !/t\(persona\.perfil/.test(C[AGENDA]));
  check('17) ni el nombre de un lugar del catálogo', /\{opcion\.label\}/.test(C[LUGAR]) && !/t\(opcion\.label\)/.test(C[LUGAR]));
  check('17) ni el nombre de quien publica', /userProfile\?\.displayName \|\| t\('composer\.you'\)/.test(C[CREAR]));

  /* Las marcas, iguales en los dos idiomas. */
  check('18) ËContact y Weël se escriben igual en los dos',
    ES.composer.econtact === 'ËContact' && EN.composer.econtact === 'ËContact'
    && ES.composer.kindWeel === 'Weël' && EN.composer.kindWeel === 'Weël');
  const conWee = Object.keys(ES.composer).filter((k) => /Weë/.test(ES.composer[k]));
  check('18) y las ' + conWee.length + ' frases que nombran a Weë la siguen nombrando en inglés',
    conWee.every((k) => /Weë/.test(EN.composer[k])), conWee.filter((k) => !/Weë/.test(EN.composer[k])).join(' '));

  /* Los nombres de sección salen de la fuente única y no se traducen. */
  check('19) los destinos de sección son marca; solo el muro general lleva clave',
    FEED.destinosDisponibles().filter((d) => d.clave).map((d) => d.id).join(',') === 'general'
    && FEED.destinosDisponibles().filter((d) => !d.clave).every((d) => /^Weë /.test(d.nombre)),
    FEED.destinosDisponibles().map((d) => d.id).join(','));
  check('19) y quien pinta resuelve la clave si la trae',
    [ENTRADA, CREAR].every((p) => /destino\.clave \? t\(destino\.clave\) : destino\.nombre/.test(C[p])));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Nada funcional se movió ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* El orden aprobado de la fila de acciones del espacio de crear. */
  const acciones = [...C[CREAR].matchAll(/<Accion\s+icono="([a-z-]+)"[\s\S]{0,220}?texto=\{t\('([a-z]+\.[A-Za-z]+)'\)\}/g)]
    .map((m) => ES[m[2].split('.')[0]][m[2].split('.')[1]]);
  check('20) Cámara · Multimedia · ËContact · Ubicación · Encuesta · Mis proyectos',
    acciones.join(' · ') === 'Cámara · Multimedia · ËContact · Ubicación · Encuesta · Mis proyectos',
    acciones.join(' · '));

  /* Y el de la entrada del Home, que es el suyo y tampoco se ha tocado. */
  const atajos = [...C[ENTRADA].matchAll(/clave: '(composer\.[A-Za-z]+)'/g)].map((m) => ES.composer[m[1].split('.')[1]]);
  check('21) y los cinco atajos de la entrada conservan su orden',
    atajos.join(' · ') === 'Cámara · Foto o vídeo · ËContact · Ubicación · Encuesta', atajos.join(' · '));

  check('22) "Cómo lo hice" no ha vuelto', !/Cómo lo hice|comoLoHice|HowIMadeIt/.test(TODO));

  /* Los límites de multimedia salen de la lógica, no de la frase. */
  check('23) diez fotos y quince segundos siguen mandando',
    /const maxImages = 10;/.test(C[CREAR]) && /const maxVideoDurationSeconds = 15;/.test(C[CREAR])
    && /\{ segundos: maxVideoDurationSeconds \}/.test(C[CREAR])
    && /\{ maximo: maxVideoDurationSeconds, duracion: lasted \}/.test(C[CREAR]));
  check('23) y el tope se calcula igual que siempre',
    /const topeImagenes = poll \? MAX_IMAGENES_CON_ENCUESTA : maxImages;/.test(C[CREAR]));

  /* La encuesta: mismos límites, mismos identificadores, misma validación. */
  check('24) la encuesta conserva sus límites y su duración',
    POLL.MAX_OPCIONES === 6 && POLL.MIN_OPCIONES === 2 && POLL.MAX_IMAGENES_CON_ENCUESTA === 1
    && POLL.DURACIONES.map((d) => d.horas).join() === '24,72,168',
    POLL.DURACIONES.map((d) => d.dias + 'd').join(','));
  check('24) y el id de una opción se sigue creando con ella',
    /option_\$\{Date\.now\(\)\.toString\(36\)\}/.test(C[BORRADOR]));
  const mal = POLL.validarEncuesta({ question: '', options: [], duration: 24 });
  check('24) el validador devuelve la CLAVE del aviso, no la frase',
    mal.ok === false && mal.clave === 'composer.pollErrEmptyQuestion' && mal.mensaje === undefined,
    JSON.stringify(mal));
  const largo = POLL.validarEncuesta({ question: 'x'.repeat(200), options: [{ id: 'a', text: 'a' }, { id: 'b', text: 'b' }], duration: 24 });
  check('24) y los números del aviso llegan aparte',
    largo.ok === false && largo.valores?.maximo === POLL.MAX_PREGUNTA,
    JSON.stringify(largo.valores));

  /* Publicar una publicación normal no cuesta Credits ni pasa por la IA. */
  check('25) publicar no toca Credits ni el motor de IA',
    !/spendCredits|creditsService|creditCosts|aiRouter|engine\//.test(TODO));
  check('25) y la encuesta tampoco', !/spendCredits|construirPoll[\s\S]{0,80}credits/i.test(C[BORRADOR]));

  /* ËContact: el Composer solo elige de lo que ya existe. */
  check('26) la agenda no crea, ni acepta, ni rechaza, ni borra relaciones',
    !/requestEContact|acceptEContact|rejectEContact|removeEContact|econtactService/.test(C[AGENDA] + C[CREAR]));
  check('26) solo lee la lista del perfil activo', /useMisEContacts\(\)/.test(C[AGENDA]));
  check('26) y nunca enseña un uid', !/persona\.identidad\}/.test(C[AGENDA].replace(/key=\{persona\.identidad\}/g, '')));

  /* Perfil Real y Perfil Weë siguen existiendo, y con su nombre. */
  check('27) las dos identidades se nombran, y se eligen por su tipo',
    ES.composer.profileReal === 'Perfil real' && ES.composer.profileWee === 'Perfil Weë'
    && EN.composer.profileReal === 'Real profile' && EN.composer.profileWee === 'Weë profile'
    && /persona\.tipo === 'wee' \? 'composer\.profileWee' : 'composer\.profileReal'/.test(C[AGENDA]));
  check('27) y el modelo de identidad no se ha tocado',
    !/nombreDeIdentidad|tipoDeIdentidad\(/.test(C[AGENDA])
    && /'Perfil real' \| 'Perfil Weë'/.test(leer('utils/econtactModel.ts')));

  /* Destinos múltiples, tal cual estaban. */
  check('28) una publicación puede ir a varios sitios',
    /const \[destinos, setDestinos\] = useState<string\[\]>/.test(C[CREAR])
    && /actuales\.includes\(id\) \? actuales\.filter\(\(d\) => d !== id\) : \[\.\.\.actuales, id\]/.test(C[CREAR])
    && /destinations: destinos/.test(C[CREAR]));

  /* La ubicación: el lugar y la zona siguen siendo dos cosas. */
  check('29) el lugar y la zona se quitan por separado',
    /setPlace\(undefined\)/.test(C[CREAR]) && /setUbicacion\(undefined\)/.test(C[CREAR])
    && /t\('composer\.removePlace'\)/.test(C[CREAR]) && /t\('composer\.removeMyLocation'\)/.test(C[CREAR]));
  check('29) y no se ha tocado la capa de ubicación',
    !/LocationContext|locationService/.test(C[CREAR].replace(/UbicacionPublica/g, '')));

  check('30) control: ni Firestore, ni reglas, ni proveedores',
    !/firestore\.rules|setDoc\(|deleteDoc\(|gemini|seedance|elevenlabs/i.test(TODO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · El inglés, en inglés ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const acentos = Object.keys(EN.composer).filter((k) => /[áéíóúñ¿¡]/i.test(EN.composer[k].replace(/Weël|Wäll|ËContact|Weë/g, '')));
  check('31) ninguna frase inglesa lleva tildes ni signos de apertura',
    acentos.length === 0, acentos.map((k) => k + '=' + EN.composer[k]).slice(0, 4).join(' | '));

  const PALABRAS = [' tu ', ' tus ', ' para ', ' una ', ' quiero', ' foto ', ' vídeo', ' encuesta', ' publicar'];
  const castellano = Object.keys(EN.composer).filter((k) => {
    const v = ' ' + String(EN.composer[k]).toLowerCase() + ' ';
    return PALABRAS.some((p) => v.includes(p));
  });
  check('32) ni palabras sueltas en castellano', castellano.length === 0, castellano.join(' '));

  /* Y al revés: nada quedó copiado, salvo lo que no tiene idioma. */
  const soloHuecos = (v) => !/[A-Za-zÀ-ÿ]/.test(String(v).replace(/\{\{[^}]*\}\}/g, ''));
  const MISMA = /^(Weël|ËContact|Video|Marketing|Multimedia)$/;
  const iguales = Object.keys(ES.composer).filter((k) => ES.composer[k] === EN.composer[k]
    && !soloHuecos(ES.composer[k]) && !MISMA.test(ES.composer[k]));
  check('33) el módulo está traducido de verdad, no copiado', iguales.length === 0, iguales.map((k) => k + '=' + ES.composer[k]).join(' | '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Cambiar de idioma sin reiniciar ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * Una frase guardada en `useState(t(...))` se queda con el idioma que había
   * al montar la pantalla. Aquí no hay ninguna: todo se resuelve al pintar.
   */
  check('34) ninguna frase se congela en el estado',
    !/useState\([^)]*\bt\('/.test(TODO) && !/useMemo\(\(\) => t\(/.test(TODO));
  check('34) y las listas guardan claves, no frases',
    /clave: 'composer\.kindPost'/.test(C[HOJA]) && /clave: 'composer\.camera'/.test(C[ENTRADA])
    && /'composer\.pollErrEmptyQuestion'/.test(C[BORRADOR]));

  /* Y ningún formato clavado a un idioma. */
  check('35) no hay formatos clavados al español',
    !/toLocale(String|DateString|TimeString)\('es'\)|(NumberFormat|DateTimeFormat)\('es'\)/.test(TODO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Que quepa un idioma más largo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const fuente = PIEZAS.map(leer).join('\n');
  check('36) los rótulos no llevan ancho clavado',
    !/width: scale\(\d+\)[^}]*\n\s*fontSize/.test(fuente));
  check('37) y el texto que puede crecer se recorta o envuelve',
    (fuente.match(/numberOfLines=/g) || []).length >= 8 && /flex: 1/.test(fuente));

  const largas = Object.keys(ES.composer).filter((k) => {
    const a = String(ES.composer[k]).length, b = String(EN.composer[k]).length;
    return b > 40 && b > a * 1.8;
  });
  check('38) ninguna frase inglesa se dispara de largo', largas.length === 0, largas.join(' '));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
