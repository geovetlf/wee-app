/**
 * LAS MARCAS QUE GUARDA WEETALK EN LUGAR DE UN TEXTO: DATOS, NO INTERFAZ.
 *
 *   node test/i18n-marcas-de-mensaje.test.mjs
 *
 * Una foto, una foto única o un audio no llevan texto, y la app guarda en su lugar una MARCA en `content` —del mensaje
 * y del último mensaje de la conversación—: «📷 Imagen», «Foto única», «🎤 Audio» (y «Modo efímero» al vaciar una
 * conversación efímera). Están así en todos los mensajes que ya existen, y una la exige `firestore.rules`, así que
 * cambiarlas sería migrar datos. Lo que se garantiza es que NADIE las lea tal cual: cada sitio que las pinta las
 * reconoce y las dice con su clave, en el idioma de quien mira.
 *
 *   · la lista de chats (InboxScreen) — `claveDeAvisoGuardado` (services/messagesService.ts);
 *   · la burbuja (ConversationScreen) — la misma, cuando el mensaje no es de texto y no trae su imagen o su audio;
 *   · el push (functions/src/social/avisos.ts, `cuerpoDelMensaje`) — en el idioma de la cuenta que lo recibe.
 *
 * Y lo que escribió una persona no se toca: un mensaje de TEXTO que diga «Foto única» sale como lo escribió.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
const sinComentarios = (t) => t.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

/* El cargador de siempre: transpila y ejecuta los módulos de verdad, con sus imports relativos. */
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const r = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  cargados.set(ruta, r);
  return r;
};

const { crearTraductor } = (await cargar('i18n/traducir.ts')).ns;
const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
const { AVISOS } = (await cargar('functions/src/shared/textosDelServidor.ts')).ns;
const avisos = (await cargar('functions/src/social/avisos.ts')).ns;
const UNICOS = [];
for (const [codigo, d] of Object.entries(DICCIONARIOS)) if (!UNICOS.some(([, otro]) => otro === d)) UNICOS.push([codigo, d]);

const CHAT = leer('screens/ConversationScreen.tsx');
const CHAT_CODIGO = sinComentarios(CHAT);
const BANDEJA = sinComentarios(leer('screens/InboxScreen.tsx'));
const MENSAJES = leer('services/messagesService.ts');

/* La tabla de marcas, leída del servicio: { 'Foto única': 'weetalk.photoOnce', … }. */
const tabla = MENSAJES.slice(MENSAJES.indexOf('const AVISOS_GUARDADOS'), MENSAJES.indexOf('};', MENSAJES.indexOf('const AVISOS_GUARDADOS')));
const MARCAS = Object.fromEntries([...tabla.matchAll(/'([^']+)': '([a-z]+\.[A-Za-z]+)'/g)].map((m) => [m[1], m[2]]));
/* El mismo reconocimiento que la app: la marca entera, o nada. */
const claveDeAvisoGuardado = (contenido) => (contenido ? MARCAS[contenido] : undefined);

console.log('\n── A · El contrato: lo que se guarda es una marca conocida ──');
{
  check('1) la tabla de marcas existe y tiene las cuatro de siempre', Object.keys(MARCAS).length === 4
    && ['Modo efímero', 'Foto única', '📷 Imagen', '🎤 Audio'].every((m) => m in MARCAS), JSON.stringify(MARCAS));
  /* Lo que manda la pantalla de chat como `content` de una foto o un audio. */
  const enviadas = [...CHAT_CODIGO.matchAll(/messagesService\.sendMessage\(convId, myUid, ([^,]+(?:\?[^,]+:[^,]+)?), '(image|audio)'/g)]
    .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
  check('2) la pantalla de chat solo guarda marcas de la tabla', enviadas.length >= 5 && enviadas.every((m) => m in MARCAS), enviadas.join(' · '));
  check('2) y las tres de foto, foto única y audio están entre ellas', ['Foto única', '📷 Imagen', '🎤 Audio'].every((m) => enviadas.includes(m)));
  const es = Object.fromEntries(Object.entries(MARCAS).map(([m, k]) => [m, k.split('.').reduce((o, p) => o?.[p], DICCIONARIOS.es)]));
  check('3) cada marca es, letra a letra, el texto español de su clave', Object.entries(es).every(([m, v]) => m === v), JSON.stringify(es));
  check('4) y las del push son las mismas (functions/src/shared/textosDelServidor.ts)',
    AVISOS.es.fotoUnica === 'Foto única' && AVISOS.es.imagen === '📷 Imagen' && AVISOS.es.audio === '🎤 Audio');
  check('5) junto al envío se explica que son datos, no interfaz',
    /MARCAS DE DATOS/.test(CHAT) && /i18n-marcas-de-mensaje\.test\.mjs/.test(CHAT));
}

console.log('\n── B · Cada sitio que las pinta las traduce, en los 16 idiomas ──');
{
  /* Cada clave de marca existe en el diccionario PROPIO de cada idioma: nadie cae al español ni al inglés. */
  const faltan = [];
  for (const [codigo, d] of UNICOS) {
    for (const clave of Object.values(MARCAS)) {
      const [m, k] = clave.split('.');
      if (typeof d[m]?.[k] !== 'string' || !d[m][k].trim()) faltan.push(`${codigo}:${clave}`);
    }
  }
  check(`6) las ${Object.keys(MARCAS).length} claves están en los ${UNICOS.length} diccionarios`, UNICOS.length === 16 && faltan.length === 0, faltan.join(' ') || 'todas');

  /* La lista de chats: reconoce la marca y la dice con t(); lo demás, tal cual. */
  check('7) la lista de chats las reconoce y las dice con su clave',
    /const avisoGuardado = claveDeAvisoGuardado\(last\?\.content\);/.test(BANDEJA) && /avisoGuardado \? t\(avisoGuardado\) : last\?\.content/.test(BANDEJA));

  /* La burbuja: la rama de texto es la única que pinta `content`, y pasa por la tabla si el mensaje no es de texto. */
  const RAMA = /\{item\.type !== 'text' && claveDeAvisoGuardado\(item\.content\)\s*\?\s*t\(claveDeAvisoGuardado\(item\.content\)!\)\s*:\s*item\.content\}/;
  const burbujaTraduce = (codigo) => RAMA.test(codigo) && (codigo.match(/item\.content/g) || []).length === 3;
  check('8) la burbuja dice la marca con su clave y no pinta `content` en ningún otro sitio', burbujaTraduce(CHAT_CODIGO));
  check('8) y la pantalla importa la misma función que la bandeja', /import \{[^}]*\bclaveDeAvisoGuardado\b[^}]*\} from '\.\.\/services\/messagesService'/.test(CHAT_CODIGO));
  /* SABOTAJE: la burbuja de antes, que pintaba `content` a secas, no pasa. */
  const antes = CHAT_CODIGO.replace(RAMA, '{item.content}');
  check('8) SABOTAJE: con la burbuja que pintaba `content` tal cual, la comprobación falla', antes !== CHAT_CODIGO && !burbujaTraduce(antes));

  /* Lo que ve cada idioma en la bandeja y en la burbuja: su texto, nunca la marca española (salvo que su palabra coincida). */
  const mal = [];
  for (const [codigo, d] of UNICOS) {
    const t = crearTraductor(codigo, DICCIONARIOS);
    for (const [marca, clave] of Object.entries(MARCAS)) {
      const [m, k] = clave.split('.');
      const visto = t(claveDeAvisoGuardado(marca));
      if (visto !== d[m][k]) mal.push(`${codigo}: ${marca} → ${visto}`);
    }
  }
  check('9) en cada idioma, cada marca se lee con el texto de SU diccionario', mal.length === 0, mal.slice(0, 4).join(' | ') || `${UNICOS.length} × ${Object.keys(MARCAS).length}`);

  /* El push: lo escribe el servidor en el idioma de quien lo recibe. */
  check('10) el push de un mensaje pasa su contenido por cuerpoDelMensaje con el idioma de quien lo recibe',
    /cuerpoDelMensaje\(content, idioma\)/.test(sinComentarios(leer('functions/src/index.ts'))));
  const pushMal = [];
  for (const [codigo] of UNICOS) {
    for (const marca of ['Foto única', '📷 Imagen', '🎤 Audio']) {
      const cuerpo = avisos.cuerpoDelMensaje(marca, codigo);
      const tabla = AVISOS[codigo] || AVISOS[codigo.split('-')[0]] || AVISOS.en;
      const esperado = tabla[{ 'Foto única': 'fotoUnica', '📷 Imagen': 'imagen', '🎤 Audio': 'audio' }[marca]];
      if (cuerpo !== esperado || (codigo !== 'es' && cuerpo === marca)) pushMal.push(`${codigo}: ${marca} → ${cuerpo}`);
    }
  }
  check('11) el push de una foto, una foto única o un audio nunca llega en español a quien no lee en español',
    pushMal.length === 0, pushMal.slice(0, 4).join(' | ') || `${UNICOS.length} idiomas (los que aún no tienen la sección del servidor, en inglés)`);
  check('11) en danés y en inglés, en su idioma', avisos.cuerpoDelMensaje('Foto única', 'da-DK') === AVISOS.da.fotoUnica
    && avisos.cuerpoDelMensaje('📷 Imagen', 'en-US') === AVISOS.en.imagen && AVISOS.en.imagen !== '📷 Imagen');
}

console.log('\n── C · Lo que escribe una persona es suyo ──');
{
  check('12) un mensaje de TEXTO no pasa por la tabla, aunque diga lo mismo que una marca', /item\.type !== 'text' && claveDeAvisoGuardado/.test(CHAT_CODIGO));
  check('12) y lo que no es una marca entera no se reconoce', claveDeAvisoGuardado('Foto única!') === undefined
    && claveDeAvisoGuardado('Mira mi 📷 Imagen') === undefined && claveDeAvisoGuardado('') === undefined);
  check('13) el push de un texto normal sale tal cual', avisos.cuerpoDelMensaje('Hola, ¿vienes?', 'da-DK') === 'Hola, ¿vienes?');
  /* Ningún otro sitio de la app pinta el último mensaje: quien lo lee lo hace para contar o para buscar. */
  const lectores = ['screens', 'components', 'hooks', 'navigation'].flatMap((d) => {
    const lista = (dir) => fs.readdirSync(path.resolve(raiz, dir), { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? lista(`${dir}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : []));
    return lista(d);
  }).filter((f) => /lastMessage/.test(sinComentarios(leer(f))));
  const RAZONADOS = {
    'screens/InboxScreen.tsx': 'la lista de chats: la pinta con claveDeAvisoGuardado (7) y la usa para buscar',
    'hooks/useConversaciones.ts': 'solo cuenta los no leídos (read y senderId); no pinta el contenido',
  };
  const nuevos = lectores.filter((f) => !RAZONADOS[f]);
  check('14) nadie más lee el último mensaje sin pasar por aquí', nuevos.length === 0, nuevos.join(' · ') || lectores.join(' · '));
  check('14) y el contador no toca el contenido', !/\.content/.test(sinComentarios(leer('hooks/useConversaciones.ts'))));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
